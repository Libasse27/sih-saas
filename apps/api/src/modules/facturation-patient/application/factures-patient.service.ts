import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FacturePatientStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { EtablissementsService } from '../../etablissements/application/etablissements.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { genererNumeroFacture } from '../domain/facture-numero-generator';
import { FacturePatientEntity } from '../infrastructure/entities/facture-patient.entity';
import { CreateFacturePatientDto } from '../presentation/dto/create-facture-patient.dto';
import { AssurancesService } from './assurances.service';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Calcul part assurance/reste à charge (decisions Phase 8, pas de tiers-payant automatisé cette
 * phase) : `clinic.factures_patient` est protégée par RLS — convention tenantContext.getManager().
 */
@Injectable()
export class FacturesPatientService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly etablissementsService: EtablissementsService,
    private readonly assurancesService: AssurancesService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<FacturePatientEntity> {
    return this.tenantContext.getManager().getRepository(FacturePatientEntity);
  }

  async create(patientId: string, dto: CreateFacturePatientDto, actingUserId: string): Promise<FacturePatientEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const etablissement = await this.etablissementsService.findById(etablissementId);
    const sequence = await this.etablissementsService.incrementerCompteur(etablissementId, 'facture_patient');
    const numero = genererNumeroFacture(etablissement.code, new Date().getFullYear(), sequence);

    const montantTotal = dto.lignes.reduce((total, ligne) => total + ligne.quantite * ligne.prixUnitaire, 0);
    const assurance = await this.assurancesService.findActivePourPatient(patientId);
    const partAssurance = assurance ? Math.round(montantTotal * (assurance.tauxCouverture / 100) * 100) / 100 : 0;
    const partPatient = Math.round((montantTotal - partAssurance) * 100) / 100;

    const facture = await this.repository.save(
      this.repository.create({
        etablissementId,
        patientId,
        admissionId: dto.admissionId ?? null,
        numero,
        lignes: dto.lignes,
        montantTotal,
        partAssurance,
        partPatient,
        statut: FacturePatientStatut.EN_ATTENTE,
        dateEmission: new Date(),
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'facture-patient.create',
      ressource: 'facture_patient',
      ressourceId: facture.id,
      metadata: { patientId, numero, montantTotal, partAssurance, partPatient },
    });

    return facture;
  }

  async findById(id: string): Promise<FacturePatientEntity> {
    const facture = await this.repository.findOne({ where: { id } });
    if (!facture) {
      throw new NotFoundException('Facture introuvable.');
    }
    return facture;
  }

  async findByPatient(patientId: string, page: number, limit: number): Promise<PaginatedResult<FacturePatientEntity>> {
    return this.findAll(page, limit, { patientId });
  }

  async findAll(
    page: number,
    limit: number,
    filtres: { patientId?: string; statut?: FacturePatientStatut } = {},
  ): Promise<PaginatedResult<FacturePatientEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: filtres,
      skip: (page - 1) * limit,
      take: limit,
      order: { dateEmission: 'DESC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async annuler(id: string, actingUserId: string): Promise<FacturePatientEntity> {
    const facture = await this.findById(id);
    if (facture.statut === FacturePatientStatut.PAYEE) {
      throw new ConflictException('Une facture déjà payée ne peut pas être annulée.');
    }

    facture.statut = FacturePatientStatut.ANNULEE;
    const saved = await this.repository.save(facture);

    await this.auditService.log({
      etablissementId: facture.etablissementId,
      userId: actingUserId,
      action: 'facture-patient.annuler',
      ressource: 'facture_patient',
      ressourceId: facture.id,
    });

    return saved;
  }

  /** Réservé à PaiementsPatientService — recalcule le statut agrégé après un paiement REUSSI. */
  async appliquerPaiement(id: string, sommeTotalePayee: number): Promise<FacturePatientEntity> {
    const facture = await this.findById(id);
    if (facture.statut === FacturePatientStatut.ANNULEE) {
      throw new ConflictException('Cette facture est annulée.');
    }

    facture.statut =
      sommeTotalePayee >= facture.partPatient
        ? FacturePatientStatut.PAYEE
        : sommeTotalePayee > 0
          ? FacturePatientStatut.PARTIELLEMENT_PAYEE
          : FacturePatientStatut.EN_ATTENTE;

    return this.repository.save(facture);
  }
}
