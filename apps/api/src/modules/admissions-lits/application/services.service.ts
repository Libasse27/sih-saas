import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { ServiceEntity } from '../infrastructure/entities/service.entity';
import { CreateServiceDto } from '../presentation/dto/create-service.dto';
import { UpdateServiceDto } from '../presentation/dto/update-service.dto';
import { PaginatedResult } from './paginated-result';
import { SitesService } from './sites.service';

/** `clinic.services` est protégée par RLS — voir patients.service.ts pour la convention tenantContext.getManager(). */
@Injectable()
export class ServicesService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly sitesService: SitesService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<ServiceEntity> {
    return this.tenantContext.getManager().getRepository(ServiceEntity);
  }

  async create(dto: CreateServiceDto, actingUserId: string): Promise<ServiceEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    // findById est RLS-scopé : lève NotFoundException si le site n'appartient pas au tenant courant.
    const site = await this.sitesService.findById(dto.siteId);
    const service = await this.repository.save(
      this.repository.create({ ...dto, etablissementId, siteId: site.id, responsableId: dto.responsableId ?? null }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'service.create',
      ressource: 'service',
      ressourceId: service.id,
    });

    return service;
  }

  async findAll(page: number, limit: number, siteId?: string): Promise<PaginatedResult<ServiceEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: siteId ? { siteId } : {},
      skip: (page - 1) * limit,
      take: limit,
      order: { nom: 'ASC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<ServiceEntity> {
    const service = await this.repository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException('Service introuvable.');
    }
    return service;
  }

  /** `code` est unique par établissement (voir l'index sur ServiceEntity) — utilisé pour résoudre
   * le service "URGENCES" provisionné par défaut sans imposer LIT_VIEW à l'appelant. */
  async findByCode(code: string): Promise<ServiceEntity | null> {
    return this.repository.findOne({ where: { code } });
  }

  async update(id: string, dto: UpdateServiceDto, actingUserId: string): Promise<ServiceEntity> {
    const service = await this.findById(id);
    Object.assign(service, dto);
    const saved = await this.repository.save(service);

    await this.auditService.log({
      etablissementId: service.etablissementId,
      userId: actingUserId,
      action: 'service.update',
      ressource: 'service',
      ressourceId: service.id,
    });

    return saved;
  }
}
