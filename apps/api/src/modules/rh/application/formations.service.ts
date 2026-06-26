import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { EmployesService } from './employes.service';
import { FormationEntity } from '../infrastructure/entities/formation.entity';
import { CreateFormationDto } from '../presentation/dto/create-formation.dto';
import { UpdateFormationDto } from '../presentation/dto/update-formation.dto';

/** `clinic.formations` est protégée par RLS — voir services.service.ts pour la convention tenantContext.getManager(). */
@Injectable()
export class FormationsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly employesService: EmployesService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<FormationEntity> {
    return this.tenantContext.getManager().getRepository(FormationEntity);
  }

  async create(employeId: string, dto: CreateFormationDto, actingUserId: string): Promise<FormationEntity> {
    await this.employesService.findById(employeId);
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const formation = await this.repository.save(
      this.repository.create({
        ...dto,
        etablissementId,
        employeId,
        organisme: dto.organisme ?? null,
        dateFin: dto.dateFin ?? null,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'rh.formation.create',
      ressource: 'formation',
      ressourceId: formation.id,
    });

    return formation;
  }

  async findAllForEmploye(employeId: string): Promise<FormationEntity[]> {
    await this.employesService.findById(employeId);
    return this.repository.find({ where: { employeId }, order: { dateDebut: 'DESC' } });
  }

  async findOne(employeId: string, id: string): Promise<FormationEntity> {
    await this.employesService.findById(employeId);
    const formation = await this.repository.findOne({ where: { id, employeId } });
    if (!formation) {
      throw new NotFoundException('Formation introuvable.');
    }
    return formation;
  }

  async update(
    employeId: string,
    id: string,
    dto: UpdateFormationDto,
    actingUserId: string,
  ): Promise<FormationEntity> {
    const formation = await this.findOne(employeId, id);
    Object.assign(formation, dto);
    const saved = await this.repository.save(formation);

    await this.auditService.log({
      etablissementId: formation.etablissementId,
      userId: actingUserId,
      action: 'rh.formation.update',
      ressource: 'formation',
      ressourceId: formation.id,
      metadata: { statut: formation.statut },
    });

    return saved;
  }

  async remove(employeId: string, id: string, actingUserId: string): Promise<void> {
    const formation = await this.findOne(employeId, id);
    await this.repository.remove(formation);

    await this.auditService.log({
      etablissementId: formation.etablissementId,
      userId: actingUserId,
      action: 'rh.formation.delete',
      ressource: 'formation',
      ressourceId: id,
    });
  }
}
