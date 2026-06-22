import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { SubscriptionsService } from '../../subscriptions/application/subscriptions.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { SiteEntity } from '../infrastructure/entities/site.entity';
import { CreateSiteDto } from '../presentation/dto/create-site.dto';
import { UpdateSiteDto } from '../presentation/dto/update-site.dto';
import { PaginatedResult } from './paginated-result';

/** `clinic.sites` est protégée par RLS — voir patients.service.ts pour la convention tenantContext.getManager(). */
@Injectable()
export class SitesService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<SiteEntity> {
    return this.tenantContext.getManager().getRepository(SiteEntity);
  }

  async create(dto: CreateSiteDto, actingUserId: string): Promise<SiteEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const sitesActuels = await this.repository.count();
    await this.subscriptionsService.assertMultiSitesAutorise(etablissementId, sitesActuels);

    const site = await this.repository.save(
      this.repository.create({ ...dto, etablissementId }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'site.create',
      ressource: 'site',
      ressourceId: site.id,
    });

    return site;
  }

  async findAll(page: number, limit: number): Promise<PaginatedResult<SiteEntity>> {
    const [items, total] = await this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { nom: 'ASC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<SiteEntity> {
    const site = await this.repository.findOne({ where: { id } });
    if (!site) {
      throw new NotFoundException('Site introuvable.');
    }
    return site;
  }

  async update(id: string, dto: UpdateSiteDto, actingUserId: string): Promise<SiteEntity> {
    const site = await this.findById(id);
    Object.assign(site, dto);
    const saved = await this.repository.save(site);

    await this.auditService.log({
      etablissementId: site.etablissementId,
      userId: actingUserId,
      action: 'site.update',
      ressource: 'site',
      ressourceId: site.id,
    });

    return saved;
  }
}
