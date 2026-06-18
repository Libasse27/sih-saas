import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionStatut, MouvementType } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { PatientsService } from '../../patients/application/patients.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { LitsService } from './lits.service';
import { PaginatedResult } from './paginated-result';
import { CreateAdmissionDto } from '../presentation/dto/create-admission.dto';
import { TransfertAdmissionDto } from '../presentation/dto/transfert-admission.dto';
import { AdmissionEntity } from '../infrastructure/entities/admission.entity';
import { MouvementPatientEntity } from '../infrastructure/entities/mouvement-patient.entity';

@Injectable()
export class AdmissionsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly patientsService: PatientsService,
    private readonly litsService: LitsService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<AdmissionEntity> {
    return this.tenantContext.getManager().getRepository(AdmissionEntity);
  }

  private get mouvementsRepository(): Repository<MouvementPatientEntity> {
    return this.tenantContext.getManager().getRepository(MouvementPatientEntity);
  }

  async create(dto: CreateAdmissionDto, actingUserId: string): Promise<AdmissionEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    // Valide l'existence du patient (et, via RLS, qu'il appartient bien à cet établissement).
    await this.patientsService.findById(dto.patientId);

    let lit = null;
    if (dto.litId) {
      lit = await this.litsService.findById(dto.litId);
      if (lit.serviceId !== dto.serviceId) {
        throw new BadRequestException("Le lit indiqué n'appartient pas au service de l'admission.");
      }
    }

    const admission = await this.repository.save(
      this.repository.create({
        etablissementId,
        patientId: dto.patientId,
        serviceId: dto.serviceId,
        litId: dto.litId ?? null,
        medecinReferentId: dto.medecinReferentId,
        motif: dto.motif,
        dateAdmission: new Date(),
        dateSortiePrevue: dto.dateSortiePrevue ? new Date(dto.dateSortiePrevue) : null,
        statut: AdmissionStatut.EN_COURS,
      }),
    );

    if (lit) {
      await this.litsService.assigner(lit.id, dto.patientId, actingUserId);
    }

    await this.mouvementsRepository.save(
      this.mouvementsRepository.create({
        etablissementId,
        patientId: dto.patientId,
        admissionId: admission.id,
        type: MouvementType.ENTREE,
        serviceDestinationId: dto.serviceId,
        litDestinationId: dto.litId ?? null,
        dateMouvement: new Date(),
        effectueParId: actingUserId,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'admission.create',
      ressource: 'admission',
      ressourceId: admission.id,
      metadata: { patientId: dto.patientId },
    });

    return admission;
  }

  async findAll(
    page: number,
    limit: number,
    filtres: { patientId?: string; statut?: AdmissionStatut } = {},
  ): Promise<PaginatedResult<AdmissionEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: filtres,
      skip: (page - 1) * limit,
      take: limit,
      order: { dateAdmission: 'DESC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<AdmissionEntity> {
    const admission = await this.repository.findOne({ where: { id } });
    if (!admission) {
      throw new NotFoundException('Admission introuvable.');
    }
    return admission;
  }

  /** Utilisé par CareContextGuard (lien de soin : médecin référent / service d'affectation). */
  async findAdmissionEnCoursPourPatient(patientId: string): Promise<AdmissionEntity | null> {
    return this.repository.findOne({ where: { patientId, statut: AdmissionStatut.EN_COURS } });
  }

  async transfert(id: string, dto: TransfertAdmissionDto, actingUserId: string): Promise<AdmissionEntity> {
    const admission = await this.findById(id);
    if (admission.statut !== AdmissionStatut.EN_COURS) {
      throw new ConflictException("Seule une admission en cours peut être transférée.");
    }

    const nouveauLit = await this.litsService.findById(dto.litDestinationId);
    const ancienServiceId = admission.serviceId;
    const ancienLitId = admission.litId;

    if (ancienLitId) {
      await this.litsService.liberer(ancienLitId, actingUserId);
    }
    await this.litsService.assigner(nouveauLit.id, admission.patientId, actingUserId);

    admission.litId = nouveauLit.id;
    admission.serviceId = nouveauLit.serviceId;
    const saved = await this.repository.save(admission);

    await this.mouvementsRepository.save(
      this.mouvementsRepository.create({
        etablissementId: admission.etablissementId,
        patientId: admission.patientId,
        admissionId: admission.id,
        type: MouvementType.TRANSFERT,
        serviceOrigineId: ancienServiceId,
        litOrigineId: ancienLitId,
        serviceDestinationId: nouveauLit.serviceId,
        litDestinationId: nouveauLit.id,
        dateMouvement: new Date(),
        effectueParId: actingUserId,
      }),
    );

    await this.auditService.log({
      etablissementId: admission.etablissementId,
      userId: actingUserId,
      action: 'admission.transfert',
      ressource: 'admission',
      ressourceId: admission.id,
    });

    return saved;
  }

  async sortie(id: string, actingUserId: string): Promise<AdmissionEntity> {
    const admission = await this.findById(id);
    if (admission.statut !== AdmissionStatut.EN_COURS) {
      throw new ConflictException("Cette admission n'est pas en cours.");
    }

    if (admission.litId) {
      await this.litsService.liberer(admission.litId, actingUserId);
    }

    admission.statut = AdmissionStatut.TERMINEE;
    admission.dateSortieReelle = new Date();
    const saved = await this.repository.save(admission);

    await this.mouvementsRepository.save(
      this.mouvementsRepository.create({
        etablissementId: admission.etablissementId,
        patientId: admission.patientId,
        admissionId: admission.id,
        type: MouvementType.SORTIE,
        serviceOrigineId: admission.serviceId,
        litOrigineId: admission.litId,
        dateMouvement: new Date(),
        effectueParId: actingUserId,
      }),
    );

    await this.auditService.log({
      etablissementId: admission.etablissementId,
      userId: actingUserId,
      action: 'admission.sortie',
      ressource: 'admission',
      ressourceId: admission.id,
    });

    return saved;
  }
}
