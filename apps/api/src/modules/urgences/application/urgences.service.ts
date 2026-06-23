import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AlerteUrgenceStatut, IssueUrgence, UrgenceStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AdmissionsService } from '../../admissions-lits/application/admissions.service';
import { ServicesService } from '../../admissions-lits/application/services.service';
import { AuditService } from '../../audit/application/audit.service';
import { RealtimeGateway } from '../../notifications/presentation/realtime.gateway';
import { PatientsService } from '../../patients/application/patients.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { ClotureUrgenceDto } from '../presentation/dto/cloture-urgence.dto';
import { CreateAlerteMedicaleDto } from '../presentation/dto/create-alerte-medicale.dto';
import { CreateSurveillanceUrgenceDto } from '../presentation/dto/create-surveillance-urgence.dto';
import { CreateUrgenceDto } from '../presentation/dto/create-urgence.dto';
import { TriageUrgenceDto } from '../presentation/dto/triage-urgence.dto';
import { AlerteMedicaleEntity } from '../infrastructure/entities/alerte-medicale.entity';
import { SurveillanceUrgenceEntity } from '../infrastructure/entities/surveillance-urgence.entity';
import { TriageEntity } from '../infrastructure/entities/triage.entity';
import { UrgenceEntity } from '../infrastructure/entities/urgence.entity';
import { PaginatedResult } from './paginated-result';

export interface UrgenceDetail extends UrgenceEntity {
  triages: TriageEntity[];
  surveillances: SurveillanceUrgenceEntity[];
  alertes: AlerteMedicaleEntity[];
}

/**
 * Module "Urgences" (prompt maître §10.4) : Triage/Urgence/AlerteMedicale/SurveillanceUrgence.
 * `UrgencesController` (route plate `/urgences`, jamais 🩺 — premier contact, même raisonnement
 * que ADMISSION_CREATE) consomme create/findAll/findOne/trier ; `UrgencesPatientController`
 * (nichée `/patients/:patientId/urgences`, 🩺) consomme priseEnCharge/surveillance/alerte/cloturer.
 */
@Injectable()
export class UrgencesService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly patientsService: PatientsService,
    private readonly admissionsService: AdmissionsService,
    private readonly servicesService: ServicesService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private get repository(): Repository<UrgenceEntity> {
    return this.tenantContext.getManager().getRepository(UrgenceEntity);
  }

  private get triagesRepository(): Repository<TriageEntity> {
    return this.tenantContext.getManager().getRepository(TriageEntity);
  }

  private get surveillancesRepository(): Repository<SurveillanceUrgenceEntity> {
    return this.tenantContext.getManager().getRepository(SurveillanceUrgenceEntity);
  }

  private get alertesRepository(): Repository<AlerteMedicaleEntity> {
    return this.tenantContext.getManager().getRepository(AlerteMedicaleEntity);
  }

  async create(dto: CreateUrgenceDto, actingUserId: string): Promise<UrgenceEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    // Valide l'existence du patient (et, via RLS, qu'il appartient bien à cet établissement).
    await this.patientsService.findById(dto.patientId);
    // Le service "URGENCES" est unique par établissement (provisionné par défaut, Phase 32) — le
    // résoudre par code évite d'imposer LIT_VIEW à l'appelant juste pour choisir un service qui
    // n'a de toute façon qu'une seule valeur possible (voir l'index unique sur ServiceEntity.code).
    const serviceUrgences = await this.servicesService.findByCode('URGENCES');
    if (!serviceUrgences) {
      throw new BadRequestException("Le service \"Urgences\" n'est pas provisionné pour cet établissement.");
    }

    const urgence = await this.repository.save(
      this.repository.create({
        etablissementId,
        patientId: dto.patientId,
        serviceId: serviceUrgences.id,
        motif: dto.motif,
        niveauTriage: dto.niveauTriage,
        statut: UrgenceStatut.EN_ATTENTE,
        dateArrivee: new Date(),
      }),
    );

    await this.triagesRepository.save(
      this.triagesRepository.create({
        etablissementId,
        urgenceId: urgence.id,
        niveau: dto.niveauTriage,
        effectueParId: actingUserId,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'urgence.create',
      ressource: 'urgence',
      ressourceId: urgence.id,
      metadata: { patientId: dto.patientId, niveauTriage: dto.niveauTriage },
    });
    this.diffuser(etablissementId, 'urgence:nouvelle', urgence);

    return urgence;
  }

  async findAll(
    page: number,
    limit: number,
    filtres: { statut?: UrgenceStatut; serviceId?: string } = {},
  ): Promise<PaginatedResult<UrgenceEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: filtres,
      skip: (page - 1) * limit,
      take: limit,
      order: { dateArrivee: 'DESC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<UrgenceEntity> {
    const urgence = await this.repository.findOne({ where: { id } });
    if (!urgence) {
      throw new NotFoundException('Urgence introuvable.');
    }
    return urgence;
  }

  async findDetailComplet(id: string): Promise<UrgenceDetail> {
    const urgence = await this.findById(id);
    const [triages, surveillances, alertes] = await Promise.all([
      this.triagesRepository.find({ where: { urgenceId: id }, order: { createdAt: 'DESC' } }),
      this.surveillancesRepository.find({ where: { urgenceId: id }, order: { createdAt: 'DESC' } }),
      this.alertesRepository.find({ where: { urgenceId: id }, order: { createdAt: 'DESC' } }),
    ]);
    return { ...urgence, triages, surveillances, alertes };
  }

  async trier(id: string, dto: TriageUrgenceDto, actingUserId: string): Promise<UrgenceEntity> {
    const urgence = await this.findById(id);
    this.assertEpisodeOuvert(urgence);

    await this.triagesRepository.save(
      this.triagesRepository.create({
        etablissementId: urgence.etablissementId,
        urgenceId: id,
        niveau: dto.niveau,
        tensionArterielle: dto.tensionArterielle ?? null,
        pouls: dto.pouls ?? null,
        temperature: dto.temperature ?? null,
        saturationO2: dto.saturationO2 ?? null,
        effectueParId: actingUserId,
      }),
    );

    urgence.niveauTriage = dto.niveau;
    const saved = await this.repository.save(urgence);

    await this.auditService.log({
      etablissementId: urgence.etablissementId,
      userId: actingUserId,
      action: 'urgence.triage',
      ressource: 'urgence',
      ressourceId: id,
      metadata: { niveauTriage: dto.niveau },
    });
    this.diffuser(urgence.etablissementId, 'urgence:triage-maj', saved);

    return saved;
  }

  async priseEnCharge(id: string, actingUserId: string): Promise<UrgenceEntity> {
    const urgence = await this.findById(id);
    this.assertEpisodeOuvert(urgence);

    urgence.medecinPriseEnChargeId = actingUserId;
    urgence.statut = UrgenceStatut.EN_COURS;
    const saved = await this.repository.save(urgence);

    await this.auditService.log({
      etablissementId: urgence.etablissementId,
      userId: actingUserId,
      action: 'urgence.prise-en-charge',
      ressource: 'urgence',
      ressourceId: id,
    });
    this.diffuser(urgence.etablissementId, 'urgence:prise-en-charge', saved);

    return saved;
  }

  async ajouterSurveillance(
    id: string,
    dto: CreateSurveillanceUrgenceDto,
    actingUserId: string,
  ): Promise<SurveillanceUrgenceEntity> {
    const urgence = await this.findById(id);
    this.assertEpisodeOuvert(urgence);

    const surveillance = await this.surveillancesRepository.save(
      this.surveillancesRepository.create({
        etablissementId: urgence.etablissementId,
        urgenceId: id,
        tensionArterielle: dto.tensionArterielle ?? null,
        pouls: dto.pouls ?? null,
        temperature: dto.temperature ?? null,
        saturationO2: dto.saturationO2 ?? null,
        frequenceRespiratoire: dto.frequenceRespiratoire ?? null,
        glasgow: dto.glasgow ?? null,
        observation: dto.observation ?? null,
        releveParId: actingUserId,
      }),
    );

    await this.auditService.log({
      etablissementId: urgence.etablissementId,
      userId: actingUserId,
      action: 'urgence.surveillance.create',
      ressource: 'urgence',
      ressourceId: id,
    });
    this.diffuser(urgence.etablissementId, 'urgence:surveillance', { urgenceId: id, surveillance });

    return surveillance;
  }

  async creerAlerte(id: string, dto: CreateAlerteMedicaleDto, actingUserId: string): Promise<AlerteMedicaleEntity> {
    const urgence = await this.findById(id);
    this.assertEpisodeOuvert(urgence);

    const alerte = await this.alertesRepository.save(
      this.alertesRepository.create({
        etablissementId: urgence.etablissementId,
        urgenceId: id,
        type: dto.type,
        message: dto.message,
        declencheeParId: actingUserId,
      }),
    );

    await this.auditService.log({
      etablissementId: urgence.etablissementId,
      userId: actingUserId,
      action: 'urgence.alerte.create',
      ressource: 'urgence',
      ressourceId: id,
      metadata: { type: dto.type },
    });
    // Diffusion immédiate (pas après commit) : une alerte médicale est par nature urgente,
    // contrairement aux notifications de routine (admission/RDV) qui peuvent attendre le commit.
    this.realtimeGateway.emitToEtablissement(urgence.etablissementId, 'urgence:alerte', {
      urgenceId: id,
      patientId: urgence.patientId,
      alerte,
    });

    return alerte;
  }

  async acquitterAlerte(id: string, alerteId: string, actingUserId: string): Promise<AlerteMedicaleEntity> {
    const urgence = await this.findById(id);
    const alerte = await this.alertesRepository.findOne({ where: { id: alerteId, urgenceId: id } });
    if (!alerte) {
      throw new NotFoundException('Alerte introuvable.');
    }
    if (alerte.statut === AlerteUrgenceStatut.ACQUITTEE) {
      throw new ConflictException('Cette alerte est déjà acquittée.');
    }

    alerte.statut = AlerteUrgenceStatut.ACQUITTEE;
    alerte.acquitteeParId = actingUserId;
    alerte.dateAcquittement = new Date();
    const saved = await this.alertesRepository.save(alerte);

    await this.auditService.log({
      etablissementId: urgence.etablissementId,
      userId: actingUserId,
      action: 'urgence.alerte.acquitter',
      ressource: 'urgence',
      ressourceId: id,
      metadata: { alerteId },
    });
    this.diffuser(urgence.etablissementId, 'urgence:alerte-acquittee', saved);

    return saved;
  }

  async cloturer(id: string, dto: ClotureUrgenceDto, actingUserId: string): Promise<UrgenceEntity> {
    const urgence = await this.findById(id);
    this.assertEpisodeOuvert(urgence);

    if (dto.issue === IssueUrgence.TRANSFERT_HOSPITALISATION) {
      if (!dto.serviceId) {
        throw new BadRequestException('serviceId requis pour un transfert vers hospitalisation.');
      }
      const medecinReferentId = dto.medecinReferentId ?? urgence.medecinPriseEnChargeId;
      if (!medecinReferentId) {
        throw new BadRequestException('Aucun médecin référent disponible pour la nouvelle admission.');
      }
      const admission = await this.admissionsService.create(
        {
          patientId: urgence.patientId,
          serviceId: dto.serviceId,
          litId: dto.litId,
          medecinReferentId,
          motif: urgence.motif,
          dateSortiePrevue: dto.dateSortiePrevue,
        },
        actingUserId,
      );
      urgence.admissionId = admission.id;
      urgence.statut = UrgenceStatut.TRANSFEREE;
    } else if (dto.issue === IssueUrgence.DECES) {
      urgence.statut = UrgenceStatut.DECES;
    } else {
      urgence.statut = UrgenceStatut.SORTIE;
    }

    urgence.dateSortie = new Date();
    const saved = await this.repository.save(urgence);

    await this.auditService.log({
      etablissementId: urgence.etablissementId,
      userId: actingUserId,
      action: 'urgence.cloture',
      ressource: 'urgence',
      ressourceId: id,
      metadata: { issue: dto.issue },
    });
    this.diffuser(urgence.etablissementId, 'urgence:cloture', saved);

    return saved;
  }

  private assertEpisodeOuvert(urgence: UrgenceEntity): void {
    if (urgence.statut !== UrgenceStatut.EN_ATTENTE && urgence.statut !== UrgenceStatut.EN_COURS) {
      throw new ConflictException('Cet épisode aux urgences est déjà clôturé.');
    }
  }

  private diffuser(etablissementId: string, evenement: string, payload: unknown): void {
    this.tenantContext.afterCommit(() => {
      this.realtimeGateway.emitToEtablissement(etablissementId, evenement, payload);
    });
  }
}
