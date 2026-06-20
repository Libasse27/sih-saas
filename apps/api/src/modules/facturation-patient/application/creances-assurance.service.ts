import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { StatutCreanceAssurance } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { CreanceAssuranceEntity } from '../infrastructure/entities/creance-assurance.entity';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Suivi interne des créances assurance (tiers-payant, Phase 17) — voir creance-assurance.entity.ts.
 * `clinic.creances_assurance` est protégée par RLS — convention tenantContext.getManager().
 */
@Injectable()
export class CreancesAssuranceService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<CreanceAssuranceEntity> {
    return this.tenantContext.getManager().getRepository(CreanceAssuranceEntity);
  }

  /** Appelé par FacturesPatientService.create() — jamais exposé directement via un endpoint. */
  async creerPourFacture(facturePatientId: string, assuranceId: string, montant: number): Promise<CreanceAssuranceEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    return this.repository.save(
      this.repository.create({
        etablissementId,
        facturePatientId,
        assuranceId,
        montant,
        statut: StatutCreanceAssurance.A_SOUMETTRE,
      }),
    );
  }

  async findById(id: string): Promise<CreanceAssuranceEntity> {
    const creance = await this.repository.findOne({ where: { id } });
    if (!creance) {
      throw new NotFoundException('Créance assurance introuvable.');
    }
    return creance;
  }

  async findAll(
    page: number,
    limit: number,
    filtres: { statut?: StatutCreanceAssurance; assuranceId?: string } = {},
  ): Promise<PaginatedResult<CreanceAssuranceEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: filtres,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async soumettre(id: string, actingUserId: string): Promise<CreanceAssuranceEntity> {
    const creance = await this.findById(id);
    if (creance.statut !== StatutCreanceAssurance.A_SOUMETTRE) {
      throw new ConflictException('Seule une créance "à soumettre" peut être soumise.');
    }

    creance.statut = StatutCreanceAssurance.SOUMISE;
    creance.dateSoumission = new Date();
    const saved = await this.repository.save(creance);

    await this.auditService.log({
      etablissementId: creance.etablissementId,
      userId: actingUserId,
      action: 'creance-assurance.soumettre',
      ressource: 'creance_assurance',
      ressourceId: creance.id,
    });

    return saved;
  }

  async marquerPayee(id: string, referenceReglement: string, actingUserId: string): Promise<CreanceAssuranceEntity> {
    const creance = await this.findById(id);
    if (creance.statut !== StatutCreanceAssurance.SOUMISE) {
      throw new ConflictException('Seule une créance "soumise" peut être marquée payée.');
    }

    creance.statut = StatutCreanceAssurance.PAYEE;
    creance.dateReglement = new Date();
    creance.referenceReglement = referenceReglement;
    const saved = await this.repository.save(creance);

    await this.auditService.log({
      etablissementId: creance.etablissementId,
      userId: actingUserId,
      action: 'creance-assurance.marquer-payee',
      ressource: 'creance_assurance',
      ressourceId: creance.id,
      metadata: { referenceReglement },
    });

    return saved;
  }

  async marquerRejetee(id: string, motifRejet: string, actingUserId: string): Promise<CreanceAssuranceEntity> {
    const creance = await this.findById(id);
    if (creance.statut !== StatutCreanceAssurance.SOUMISE) {
      throw new ConflictException('Seule une créance "soumise" peut être marquée rejetée.');
    }

    creance.statut = StatutCreanceAssurance.REJETEE;
    creance.motifRejet = motifRejet;
    const saved = await this.repository.save(creance);

    await this.auditService.log({
      etablissementId: creance.etablissementId,
      userId: actingUserId,
      action: 'creance-assurance.marquer-rejetee',
      ressource: 'creance_assurance',
      ressourceId: creance.id,
      metadata: { motifRejet },
    });

    return saved;
  }
}
