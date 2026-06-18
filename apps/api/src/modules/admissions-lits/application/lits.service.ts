import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { LitStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { EtablissementsService } from '../../etablissements/application/etablissements.service';
import { RealtimeGateway } from '../../notifications/presentation/realtime.gateway';
import { SubscriptionsService } from '../../subscriptions/application/subscriptions.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { ChambresService } from './chambres.service';
import { PaginatedResult } from './paginated-result';
import { CreateLitDto } from '../presentation/dto/create-lit.dto';
import { LitEntity } from '../infrastructure/entities/lit.entity';

/**
 * `lits:updated` n'est émis qu'après le commit de la transaction RLS en cours (tenantContext.afterCommit) :
 * un client ne doit jamais recevoir un statut de lit qui finirait par être annulé par un rollback.
 * Référence : docs/phase-0/plan-de-phases.md Phase 6, strategie-isolation.md §1.
 */
@Injectable()
export class LitsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly chambresService: ChambresService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly etablissementsService: EtablissementsService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private get repository(): Repository<LitEntity> {
    return this.tenantContext.getManager().getRepository(LitEntity);
  }

  async create(dto: CreateLitDto, actingUserId: string): Promise<LitEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const chambre = await this.chambresService.findById(dto.chambreId);

    await this.subscriptionsService.assertWithinLimit(etablissementId, 'maxLits');

    const lit = await this.repository.save(
      this.repository.create({
        etablissementId,
        chambreId: chambre.id,
        serviceId: chambre.serviceId,
        numero: dto.numero,
        statut: LitStatut.LIBRE,
      }),
    );

    await this.etablissementsService.incrementUsage(etablissementId, 'lits', 1);
    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'lit.create',
      ressource: 'lit',
      ressourceId: lit.id,
    });

    return lit;
  }

  async findAll(
    page: number,
    limit: number,
    filtres: { serviceId?: string; statut?: LitStatut } = {},
  ): Promise<PaginatedResult<LitEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: filtres,
      skip: (page - 1) * limit,
      take: limit,
      order: { numero: 'ASC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<LitEntity> {
    const lit = await this.repository.findOne({ where: { id } });
    if (!lit) {
      throw new NotFoundException('Lit introuvable.');
    }
    return lit;
  }

  /** Réservé à AdmissionsService — l'API publique d'assignation passe par /admissions (création/transfert). */
  async assigner(id: string, patientId: string, actingUserId: string): Promise<LitEntity> {
    const lit = await this.findById(id);
    if (lit.statut !== LitStatut.LIBRE) {
      throw new ConflictException(`Le lit n'est pas libre (statut actuel : ${lit.statut}).`);
    }

    lit.statut = LitStatut.OCCUPE;
    lit.patientActuelId = patientId;
    const saved = await this.repository.save(lit);

    await this.auditService.log({
      etablissementId: lit.etablissementId,
      userId: actingUserId,
      action: 'lit.assigner',
      ressource: 'lit',
      ressourceId: lit.id,
      metadata: { patientId },
    });
    this.emitMiseAJour(saved);

    return saved;
  }

  async liberer(id: string, actingUserId: string): Promise<LitEntity> {
    const lit = await this.findById(id);

    lit.statut = LitStatut.LIBRE;
    lit.patientActuelId = null;
    const saved = await this.repository.save(lit);

    await this.auditService.log({
      etablissementId: lit.etablissementId,
      userId: actingUserId,
      action: 'lit.liberer',
      ressource: 'lit',
      ressourceId: lit.id,
    });
    this.emitMiseAJour(saved);

    return saved;
  }

  async changerStatutStructurel(id: string, statut: LitStatut, actingUserId: string): Promise<LitEntity> {
    if (statut === LitStatut.OCCUPE) {
      throw new BadRequestException("Le statut OCCUPE ne se fixe qu'en assignant un patient (POST /admissions).");
    }

    const lit = await this.findById(id);
    lit.statut = statut;
    lit.patientActuelId = null;
    const saved = await this.repository.save(lit);

    await this.auditService.log({
      etablissementId: lit.etablissementId,
      userId: actingUserId,
      action: 'lit.statut.update',
      ressource: 'lit',
      ressourceId: lit.id,
      metadata: { statut },
    });
    this.emitMiseAJour(saved);

    return saved;
  }

  private emitMiseAJour(lit: LitEntity): void {
    this.tenantContext.afterCommit(() => {
      this.realtimeGateway.emitToEtablissement(lit.etablissementId, 'lits:updated', {
        id: lit.id,
        chambreId: lit.chambreId,
        serviceId: lit.serviceId,
        numero: lit.numero,
        statut: lit.statut,
        patientActuelId: lit.patientActuelId,
      });
    });
  }
}
