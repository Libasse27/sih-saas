import { Injectable, NotFoundException } from '@nestjs/common';
import { DemandeMaintenanceStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { DemandeMaintenanceEntity } from '../infrastructure/entities/demande-maintenance.entity';
import { CreateDemandeMaintenanceDto } from '../presentation/dto/create-demande-maintenance.dto';
import { UpdateDemandeMaintenanceDto } from '../presentation/dto/update-demande-maintenance.dto';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** `clinic.demandes_maintenance` est protégée par RLS — voir services.service.ts pour la convention tenantContext.getManager(). */
@Injectable()
export class MaintenanceService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<DemandeMaintenanceEntity> {
    return this.tenantContext.getManager().getRepository(DemandeMaintenanceEntity);
  }

  async create(dto: CreateDemandeMaintenanceDto, demandeurId: string): Promise<DemandeMaintenanceEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const demande = await this.repository.save(
      this.repository.create({
        ...dto,
        etablissementId,
        demandeurId,
        localisation: dto.localisation ?? null,
        dateSignalement: new Date(),
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: demandeurId,
      action: 'maintenance.demande.create',
      ressource: 'demande_maintenance',
      ressourceId: demande.id,
    });

    return demande;
  }

  async findAll(page: number, limit: number): Promise<PaginatedResult<DemandeMaintenanceEntity>> {
    const [items, total] = await this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { dateSignalement: 'DESC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<DemandeMaintenanceEntity> {
    const demande = await this.repository.findOne({ where: { id } });
    if (!demande) {
      throw new NotFoundException('Demande de maintenance introuvable.');
    }
    return demande;
  }

  async update(id: string, dto: UpdateDemandeMaintenanceDto, actingUserId: string): Promise<DemandeMaintenanceEntity> {
    const demande = await this.findById(id);
    Object.assign(demande, dto);
    if (dto.statut === DemandeMaintenanceStatut.RESOLUE && !demande.dateResolution) {
      demande.dateResolution = new Date();
    }
    const saved = await this.repository.save(demande);

    await this.auditService.log({
      etablissementId: demande.etablissementId,
      userId: actingUserId,
      action: 'maintenance.demande.update',
      ressource: 'demande_maintenance',
      ressourceId: demande.id,
      metadata: { statut: demande.statut },
    });

    return saved;
  }
}
