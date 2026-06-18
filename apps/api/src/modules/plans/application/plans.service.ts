import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanEntity } from '../infrastructure/entities/plan.entity';
import { CreatePlanDto } from '../presentation/dto/create-plan.dto';
import { UpdatePlanDto } from '../presentation/dto/update-plan.dto';

const PUBLIC_CACHE_TTL_MS = 60_000;

@Injectable()
export class PlansService {
  // Cache mémoire simple pour GET /api/plans (public) — invalidé à chaque écriture.
  // Pas de Redis ici : un seul instance d'API pour l'instant, voir docs/phase-0/plan-de-phases.md.
  private publicCache: { plans: PlanEntity[]; cachedAt: number } | null = null;

  constructor(@InjectRepository(PlanEntity) private readonly repository: Repository<PlanEntity>) {}

  async create(dto: CreatePlanDto): Promise<PlanEntity> {
    const existing = await this.repository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Un plan avec le code "${dto.code}" existe déjà.`);
    }

    const plan = await this.repository.save(
      this.repository.create({
        ...dto,
        visible: dto.visible ?? true,
        essaiGratuitJours: dto.essaiGratuitJours ?? 0,
        ordreAffichage: dto.ordreAffichage ?? 0,
      }),
    );
    this.invalidatePublicCache();
    return plan;
  }

  /** Catalogue public (page de tarifs) : uniquement les plans visibles et actifs, mis en cache. */
  async findPublic(): Promise<PlanEntity[]> {
    if (this.publicCache && Date.now() - this.publicCache.cachedAt < PUBLIC_CACHE_TTL_MS) {
      return this.publicCache.plans;
    }

    const plans = await this.repository.find({
      where: { visible: true, actif: true },
      order: { ordreAffichage: 'ASC' },
    });
    this.publicCache = { plans, cachedAt: Date.now() };
    return plans;
  }

  /** Catalogue complet (administration plateforme), y compris masqués/désactivés. */
  async findAllAdmin(): Promise<PlanEntity[]> {
    return this.repository.find({ order: { ordreAffichage: 'ASC' } });
  }

  async findById(id: string): Promise<PlanEntity> {
    const plan = await this.repository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan introuvable.');
    }
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto): Promise<PlanEntity> {
    const plan = await this.findById(id);
    Object.assign(plan, dto, { version: plan.version + 1 });
    const saved = await this.repository.save(plan);
    this.invalidatePublicCache();
    return saved;
  }

  async setActif(id: string, actif: boolean): Promise<PlanEntity> {
    const plan = await this.findById(id);
    plan.actif = actif;
    const saved = await this.repository.save(plan);
    this.invalidatePublicCache();
    return saved;
  }

  private invalidatePublicCache(): void {
    this.publicCache = null;
  }
}
