import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { ChambreEntity } from '../infrastructure/entities/chambre.entity';
import { CreateChambreDto } from '../presentation/dto/create-chambre.dto';
import { PaginatedResult } from './paginated-result';
import { ServicesService } from './services.service';

@Injectable()
export class ChambresService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly servicesService: ServicesService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<ChambreEntity> {
    return this.tenantContext.getManager().getRepository(ChambreEntity);
  }

  async create(dto: CreateChambreDto, actingUserId: string): Promise<ChambreEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    // findById est RLS-scopé : lève NotFoundException si le service n'appartient pas au tenant courant
    // (validation absente avant la Phase 34 — dto.serviceId était accepté sans vérification).
    const service = await this.servicesService.findById(dto.serviceId);
    const chambre = await this.repository.save(
      this.repository.create({ ...dto, etablissementId, siteId: service.siteId }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'chambre.create',
      ressource: 'chambre',
      ressourceId: chambre.id,
    });

    return chambre;
  }

  async findAll(
    page: number,
    limit: number,
    filtres: { serviceId?: string; siteId?: string } = {},
  ): Promise<PaginatedResult<ChambreEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: filtres,
      skip: (page - 1) * limit,
      take: limit,
      order: { numero: 'ASC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<ChambreEntity> {
    const chambre = await this.repository.findOne({ where: { id } });
    if (!chambre) {
      throw new NotFoundException('Chambre introuvable.');
    }
    return chambre;
  }
}
