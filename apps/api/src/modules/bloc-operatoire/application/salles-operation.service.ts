import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SalleOperationStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { CreateSalleOperationDto } from '../presentation/dto/create-salle-operation.dto';
import { UpdateSalleOperationDto } from '../presentation/dto/update-salle-operation.dto';
import { SalleOperationEntity } from '../infrastructure/entities/salle-operation.entity';
import { PaginatedResult } from './paginated-result';

/** `clinic.salles_operation` est protégée par RLS — convention tenantContext.getManager(). */
@Injectable()
export class SallesOperationService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<SalleOperationEntity> {
    return this.tenantContext.getManager().getRepository(SalleOperationEntity);
  }

  async create(dto: CreateSalleOperationDto, actingUserId: string): Promise<SalleOperationEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const salle = await this.repository.save(
      this.repository.create({
        etablissementId,
        nom: dto.nom,
        equipement: dto.equipement ?? null,
        statut: SalleOperationStatut.LIBRE,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'salle-operation.create',
      ressource: 'salle_operation',
      ressourceId: salle.id,
    });

    return salle;
  }

  async findAll(page: number, limit: number): Promise<PaginatedResult<SalleOperationEntity>> {
    const [items, total] = await this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { nom: 'ASC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<SalleOperationEntity> {
    const salle = await this.repository.findOne({ where: { id } });
    if (!salle) {
      throw new NotFoundException('Salle d’opération introuvable.');
    }
    return salle;
  }

  async update(id: string, dto: UpdateSalleOperationDto, actingUserId: string): Promise<SalleOperationEntity> {
    if (dto.statut === SalleOperationStatut.OCCUPEE) {
      throw new BadRequestException("Le statut OCCUPEE ne se fixe qu'en démarrant une intervention (PATCH .../demarrer).");
    }

    const salle = await this.findById(id);
    Object.assign(salle, dto);
    const saved = await this.repository.save(salle);

    await this.auditService.log({
      etablissementId: salle.etablissementId,
      userId: actingUserId,
      action: 'salle-operation.update',
      ressource: 'salle_operation',
      ressourceId: salle.id,
      metadata: { statut: saved.statut },
    });

    return saved;
  }

  /** Réservé à InterventionsService — bascule automatique LIBRE/OCCUPEE (démarrage/clôture). */
  async changerStatutOccupation(id: string, statut: SalleOperationStatut): Promise<SalleOperationEntity> {
    const salle = await this.findById(id);
    salle.statut = statut;
    return this.repository.save(salle);
  }
}
