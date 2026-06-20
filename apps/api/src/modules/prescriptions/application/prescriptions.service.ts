import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrescriptionStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
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

/** `clinic.prescriptions`/`prescription_lignes` sont protégées par RLS — convention tenantContext.getManager(). */
@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
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
}
