import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrescriptionStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { PushNotificationsService } from '../../notifications/application/push-notifications.service';
import { RealtimeGateway } from '../../notifications/presentation/realtime.gateway';
import { PatientsService } from '../../patients/application/patients.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { PrescriptionLigneEntity } from '../infrastructure/entities/prescription-ligne.entity';
import { PrescriptionEntity } from '../infrastructure/entities/prescription.entity';
import { CreatePrescriptionDto } from '../presentation/dto/create-prescription.dto';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PrescriptionAvecLignes {
  prescription: PrescriptionEntity;
  lignes: PrescriptionLigneEntity[];
}

/**
 * `clinic.prescriptions`/`prescription_lignes` sont protégées par RLS — convention
 * tenantContext.getManager(). Notifications (gap identifié à l'audit du 2026-06-21) : la validation
 * par le prescripteur est le signal que la pharmacie doit dispenser — diffusion tenant-wide (même
 * portée que `stock:alerte`/`labo:resultat.disponible`, consommée par la file de travail pharmacie,
 * Phase 18) + push patient générique (jamais de nom de médicament dans le corps).
 */
@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
    private readonly patientsService: PatientsService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  private get repository(): Repository<PrescriptionEntity> {
    return this.tenantContext.getManager().getRepository(PrescriptionEntity);
  }

  private get lignesRepository(): Repository<PrescriptionLigneEntity> {
    return this.tenantContext.getManager().getRepository(PrescriptionLigneEntity);
  }

  async create(patientId: string, dto: CreatePrescriptionDto, prescripteurId: string): Promise<PrescriptionAvecLignes> {
    const etablissementId = this.tenantContext.getEtablissementId()!;

    const prescription = await this.repository.save(
      this.repository.create({
        etablissementId,
        patientId,
        consultationId: dto.consultationId ?? null,
        prescripteurId,
        date: new Date(),
        statut: PrescriptionStatut.EN_ATTENTE,
      }),
    );

    const lignes = await this.lignesRepository.save(
      dto.lignes.map((ligne) => this.lignesRepository.create({ ...ligne, etablissementId, prescriptionId: prescription.id })),
    );

    await this.auditService.log({
      etablissementId,
      userId: prescripteurId,
      action: 'prescription.create',
      ressource: 'prescription',
      ressourceId: prescription.id,
      metadata: { patientId, nombreLignes: lignes.length },
    });

    return { prescription, lignes };
  }

  async findById(id: string): Promise<PrescriptionEntity> {
    const prescription = await this.repository.findOne({ where: { id } });
    if (!prescription) {
      throw new NotFoundException('Prescription introuvable.');
    }
    return prescription;
  }

  async findLignes(prescriptionId: string): Promise<PrescriptionLigneEntity[]> {
    return this.lignesRepository.find({ where: { prescriptionId } });
  }

  async findByPatient(patientId: string, page: number, limit: number): Promise<PaginatedResult<PrescriptionEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: { patientId },
      skip: (page - 1) * limit,
      take: limit,
      order: { date: 'DESC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  /**
   * File de travail transversale (pharmacien, Phase 18) — toute l'établissement, pas un seul
   * patient. Même convention que LaboratoireFileController/DispensationsController : la
   * prescription VALIDEE est déjà la chaîne d'autorisation, pas de CareContextGuard sur le contrôleur.
   */
  async findAll(
    page: number,
    limit: number,
    filtres: { statut?: PrescriptionStatut } = {},
  ): Promise<PaginatedResult<PrescriptionEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: filtres,
      skip: (page - 1) * limit,
      take: limit,
      order: { date: 'DESC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async valider(id: string, actingUserId: string): Promise<PrescriptionEntity> {
    const prescription = await this.findById(id);
    if (prescription.statut !== PrescriptionStatut.EN_ATTENTE) {
      throw new ConflictException(`Seule une prescription EN_ATTENTE peut être validée (statut actuel : ${prescription.statut}).`);
    }

    prescription.statut = PrescriptionStatut.VALIDEE;
    const saved = await this.repository.save(prescription);

    await this.auditService.log({
      etablissementId: prescription.etablissementId,
      userId: actingUserId,
      action: 'prescription.valider',
      ressource: 'prescription',
      ressourceId: prescription.id,
    });
    await this.notifier(saved, 'pharmacie:prescription.validee', 'Votre prescription a été validée et transmise à la pharmacie.');

    return saved;
  }

  async annuler(id: string, actingUserId: string): Promise<PrescriptionEntity> {
    const prescription = await this.findById(id);
    if (prescription.statut === PrescriptionStatut.DISPENSEE) {
      throw new ConflictException('Une prescription déjà dispensée ne peut plus être annulée.');
    }

    prescription.statut = PrescriptionStatut.ANNULEE;
    const saved = await this.repository.save(prescription);

    await this.auditService.log({
      etablissementId: prescription.etablissementId,
      userId: actingUserId,
      action: 'prescription.annuler',
      ressource: 'prescription',
      ressourceId: prescription.id,
    });
    await this.notifier(saved, 'pharmacie:prescription.annulee', 'Votre prescription a été annulée.');

    return saved;
  }

  /** Réservé à `DispensationsService` (PharmacieModule) une fois toutes les lignes dispensées. */
  async marquerDispensee(id: string): Promise<PrescriptionEntity> {
    const prescription = await this.findById(id);
    if (prescription.statut !== PrescriptionStatut.VALIDEE) {
      throw new ConflictException(`Seule une prescription VALIDEE peut être dispensée (statut actuel : ${prescription.statut}).`);
    }

    prescription.statut = PrescriptionStatut.DISPENSEE;
    return this.repository.save(prescription);
  }

  /** Fire-and-forget après commit — un échec d'envoi ne doit jamais faire échouer la requête HTTP. */
  private async notifier(prescription: PrescriptionEntity, evenement: string, corpsPush: string): Promise<void> {
    const patient = await this.patientsService.findById(prescription.patientId);
    this.tenantContext.afterCommit(() => {
      this.realtimeGateway.emitToEtablissement(prescription.etablissementId, evenement, {
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
      });
      if (patient.userId) {
        void this.pushNotificationsService.envoyerATousLesAppareils(patient.userId, {
          titre: 'Mise à jour de votre prescription',
          corps: corpsPush,
          data: { prescriptionId: prescription.id },
        });
      }
    });
  }
}
