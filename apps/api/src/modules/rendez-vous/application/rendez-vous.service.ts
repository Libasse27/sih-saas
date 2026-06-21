import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CanalRdv, RendezVousStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { PushNotificationsService } from '../../notifications/application/push-notifications.service';
import { RealtimeGateway } from '../../notifications/presentation/realtime.gateway';
import { PatientsService } from '../../patients/application/patients.service';
import { UsersService } from '../../users/application/users.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { RendezVousEntity } from '../infrastructure/entities/rendez-vous.entity';
import { CreateRendezVousPatientDto } from '../presentation/dto/create-rendez-vous-patient.dto';
import { CreateRendezVousDto } from '../presentation/dto/create-rendez-vous.dto';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FindRendezVousFiltres {
  praticienId?: string;
  patientId?: string;
  statut?: RendezVousStatut;
}

/**
 * `clinic.rendez_vous` est protégée par RLS — voir patients.service.ts pour la convention
 * tenantContext.getManager(). Notifications (gap identifié à l'audit du 2026-06-21) : push patient
 * (générique, jamais de motif/diagnostic dans le corps) + temps réel ciblé vers le SEUL praticien
 * concerné (`emitToUser`, pas `emitToEtablissement` — un RDV ne concerne pas tout le tenant,
 * même logique que MessagingService).
 */
@Injectable()
export class RendezVousService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
    private readonly patientsService: PatientsService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  private get repository(): Repository<RendezVousEntity> {
    return this.tenantContext.getManager().getRepository(RendezVousEntity);
  }

  async create(dto: CreateRendezVousDto, actingUserId: string): Promise<RendezVousEntity> {
    return this.creerEtJournaliser(dto.patientId, dto, actingUserId);
  }

  async createForPatient(
    patientId: string,
    dto: CreateRendezVousPatientDto,
    actingUserId: string,
  ): Promise<RendezVousEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const praticienValide = await this.usersService.estPraticienValide(dto.praticienId, etablissementId);
    if (!praticienValide) {
      throw new BadRequestException('Praticien introuvable ou non habilité à recevoir des rendez-vous.');
    }
    return this.creerEtJournaliser(patientId, dto, actingUserId);
  }

  private async creerEtJournaliser(
    patientId: string,
    dto: CreateRendezVousDto | CreateRendezVousPatientDto,
    actingUserId: string,
  ): Promise<RendezVousEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const rdv = await this.repository.save(
      this.repository.create({
        etablissementId,
        patientId,
        praticienId: dto.praticienId,
        serviceId: dto.serviceId ?? null,
        dateHeure: new Date(dto.dateHeure),
        dureeMin: (dto as CreateRendezVousDto).dureeMin ?? 30,
        motif: dto.motif ?? null,
        canal: dto.canal ?? CanalRdv.SUR_SITE,
        statut: RendezVousStatut.PLANIFIE,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'rdv.create',
      ressource: 'rendez_vous',
      ressourceId: rdv.id,
      metadata: { patientId, praticienId: dto.praticienId },
    });

    const patient = await this.patientsService.findById(patientId);
    this.tenantContext.afterCommit(() => {
      this.realtimeGateway.emitToUser(dto.praticienId, 'rdv:nouveau', {
        rendezVousId: rdv.id,
        patientId,
        dateHeure: rdv.dateHeure,
      });
      if (patient.userId) {
        void this.pushNotificationsService.envoyerATousLesAppareils(patient.userId, {
          titre: 'Rendez-vous confirmé',
          corps: 'Votre rendez-vous a bien été enregistré — ouvrez l’application pour le consulter.',
          data: { rendezVousId: rdv.id },
        });
      }
    });

    return rdv;
  }

  async findAll(page: number, limit: number, filtres: FindRendezVousFiltres = {}): Promise<PaginatedResult<RendezVousEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: filtres,
      skip: (page - 1) * limit,
      take: limit,
      order: { dateHeure: 'ASC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findByPatient(patientId: string, page: number, limit: number): Promise<PaginatedResult<RendezVousEntity>> {
    return this.findAll(page, limit, { patientId });
  }

  async findById(id: string): Promise<RendezVousEntity> {
    const rdv = await this.repository.findOne({ where: { id } });
    if (!rdv) {
      throw new NotFoundException('Rendez-vous introuvable.');
    }
    return rdv;
  }

  async changerStatut(id: string, statut: RendezVousStatut, actingUserId: string): Promise<RendezVousEntity> {
    const rdv = await this.findById(id);
    rdv.statut = statut;
    const saved = await this.repository.save(rdv);

    await this.auditService.log({
      etablissementId: rdv.etablissementId,
      userId: actingUserId,
      action: 'rdv.statut.update',
      ressource: 'rendez_vous',
      ressourceId: rdv.id,
      metadata: { statut },
    });

    // Push uniquement sur les statuts qui nécessitent une action/information du patient — TERMINE
    // et NO_SHOW se constatent après le fait, sans rien d'actionnable à lui communiquer.
    const statutsNotifiesPatient = [RendezVousStatut.CONFIRME, RendezVousStatut.ANNULE];
    const patient = statutsNotifiesPatient.includes(statut) ? await this.patientsService.findById(saved.patientId) : null;

    this.tenantContext.afterCommit(() => {
      this.realtimeGateway.emitToUser(saved.praticienId, 'rdv:statut.maj', { rendezVousId: saved.id, statut });
      if (patient?.userId) {
        const corps =
          statut === RendezVousStatut.CONFIRME
            ? 'Votre rendez-vous a été confirmé.'
            : 'Votre rendez-vous a été annulé.';
        void this.pushNotificationsService.envoyerATousLesAppareils(patient.userId, {
          titre: 'Mise à jour de votre rendez-vous',
          corps,
          data: { rendezVousId: saved.id },
        });
      }
    });

    return saved;
  }

  /** Utilisé par CareContextGuard (lien de soin : un RDV passé/à venir établit la relation praticien-patient). */
  async existeRdvEntrePraticienEtPatient(praticienId: string, patientId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { praticienId, patientId } });
    return count > 0;
  }
}
