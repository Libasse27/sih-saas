import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { EmployeEntity } from '../infrastructure/entities/employe.entity';
import { CreateEmployeDto } from '../presentation/dto/create-employe.dto';
import { UpdateEmployeDto } from '../presentation/dto/update-employe.dto';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** `clinic.employes` est protégée par RLS — voir services.service.ts pour la convention tenantContext.getManager(). */
@Injectable()
export class EmployesService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<EmployeEntity> {
    return this.tenantContext.getManager().getRepository(EmployeEntity);
  }

  async create(dto: CreateEmployeDto, actingUserId: string): Promise<EmployeEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const employe = await this.repository.save(
      this.repository.create({
        ...dto,
        etablissementId,
        userId: dto.userId ?? null,
        serviceId: dto.serviceId ?? null,
        dateNaissance: dto.dateNaissance ?? null,
        sexe: dto.sexe ?? null,
        telephone: dto.telephone ?? null,
        email: dto.email ?? null,
        adresse: dto.adresse ?? null,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'rh.employe.create',
      ressource: 'employe',
      ressourceId: employe.id,
    });

    return employe;
  }

  async findAll(page: number, limit: number): Promise<PaginatedResult<EmployeEntity>> {
    const [items, total] = await this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { nom: 'ASC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<EmployeEntity> {
    const employe = await this.repository.findOne({ where: { id } });
    if (!employe) {
      throw new NotFoundException('Employé introuvable.');
    }
    return employe;
  }

  async update(id: string, dto: UpdateEmployeDto, actingUserId: string): Promise<EmployeEntity> {
    const employe = await this.findById(id);
    Object.assign(employe, dto);
    const saved = await this.repository.save(employe);

    await this.auditService.log({
      etablissementId: employe.etablissementId,
      userId: actingUserId,
      action: 'rh.employe.update',
      ressource: 'employe',
      ressourceId: employe.id,
      metadata: { statut: employe.statut },
    });

    return saved;
  }

  async remove(id: string, actingUserId: string): Promise<void> {
    const employe = await this.findById(id);
    await this.repository.softRemove(employe);

    await this.auditService.log({
      etablissementId: employe.etablissementId,
      userId: actingUserId,
      action: 'rh.employe.delete',
      ressource: 'employe',
      ressourceId: employe.id,
    });
  }
}
