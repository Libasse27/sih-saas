import { Injectable, NotFoundException } from '@nestjs/common';
import { CycleSterilisationStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { CycleSterilisationEntity } from '../infrastructure/entities/cycle-sterilisation.entity';
import { CreateCycleSterilisationDto } from '../presentation/dto/create-cycle-sterilisation.dto';
import { UpdateCycleSterilisationDto } from '../presentation/dto/update-cycle-sterilisation.dto';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** `clinic.cycles_sterilisation` est protégée par RLS — voir services.service.ts pour la convention tenantContext.getManager(). */
@Injectable()
export class SterilisationService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<CycleSterilisationEntity> {
    return this.tenantContext.getManager().getRepository(CycleSterilisationEntity);
  }

  async create(dto: CreateCycleSterilisationDto, agentId: string): Promise<CycleSterilisationEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const cycle = await this.repository.save(
      this.repository.create({ ...dto, etablissementId, agentId, dateDebut: new Date() }),
    );

    await this.auditService.log({
      etablissementId,
      userId: agentId,
      action: 'sterilisation.cycle.create',
      ressource: 'cycle_sterilisation',
      ressourceId: cycle.id,
    });

    return cycle;
  }

  async findAll(page: number, limit: number): Promise<PaginatedResult<CycleSterilisationEntity>> {
    const [items, total] = await this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { dateDebut: 'DESC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<CycleSterilisationEntity> {
    const cycle = await this.repository.findOne({ where: { id } });
    if (!cycle) {
      throw new NotFoundException('Cycle de stérilisation introuvable.');
    }
    return cycle;
  }

  async update(id: string, dto: UpdateCycleSterilisationDto, actingUserId: string): Promise<CycleSterilisationEntity> {
    const cycle = await this.findById(id);
    cycle.statut = dto.statut;
    if (dto.statut !== CycleSterilisationStatut.EN_COURS && !cycle.dateFin) {
      cycle.dateFin = new Date();
    }
    const saved = await this.repository.save(cycle);

    await this.auditService.log({
      etablissementId: cycle.etablissementId,
      userId: actingUserId,
      action: 'sterilisation.cycle.update',
      ressource: 'cycle_sterilisation',
      ressourceId: cycle.id,
      metadata: { statut: cycle.statut },
    });

    return saved;
  }
}
