import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../../shared/redis/redis.service';
import { PlanEntity } from '../infrastructure/entities/plan.entity';
import { CreatePlanDto } from '../presentation/dto/create-plan.dto';
import { UpdatePlanDto } from '../presentation/dto/update-plan.dto';

const PUBLIC_CACHE_KEY = 'cache:plans:public';
const PUBLIC_CACHE_TTL_SECONDS = 60;

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(PlanEntity) private readonly repository: Repository<PlanEntity>,
    private readonly redis: RedisService,
  ) {}

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
    await this.invalidatePublicCache();
    return plan;
  }

  /**
   * Catalogue public (page de tarifs) : uniquement les plans visibles et actifs, mis en cache —
   * Redis (Phase 27), remplace le cache mémoire mono-instance d'origine (Phase 3/9, voir
   * historique git) qui ne survivait pas à plusieurs instances API derrière un load balancer.
   */
  async findPublic(): Promise<PlanEntity[]> {
    const cached = await this.redis.getJSON<PlanEntity[]>(PUBLIC_CACHE_KEY);
    if (cached) {
      return cached;
    }

    const plans = await this.repository.find({
      where: { visible: true, actif: true },
      order: { ordreAffichage: 'ASC' },
    });
    await this.redis.setJSON(PUBLIC_CACHE_KEY, plans, PUBLIC_CACHE_TTL_SECONDS);
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
    await this.invalidatePublicCache();
    return saved;
  }

  async setActif(id: string, actif: boolean): Promise<PlanEntity> {
    const plan = await this.findById(id);
    plan.actif = actif;
    const saved = await this.repository.save(plan);
    await this.invalidatePublicCache();
    return saved;
  }

  private async invalidatePublicCache(): Promise<void> {
    await this.redis.del(PUBLIC_CACHE_KEY);
  }
}
