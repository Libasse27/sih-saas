import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { EmployesService } from './employes.service';
import { ContratTravailEntity } from '../infrastructure/entities/contrat-travail.entity';
import { CreateContratTravailDto } from '../presentation/dto/create-contrat-travail.dto';
import { UpdateContratTravailDto } from '../presentation/dto/update-contrat-travail.dto';

/**
 * `clinic.contrats_travail` est protégée par RLS — voir services.service.ts pour la convention
 * tenantContext.getManager(). Pas de CareContextGuard sur ces routes (`rh:manage`/`rh:view` non 🩺,
 * voir contrats-travail.controller.ts) — la vérification d'existence de l'employé reste indispensable
 * (même réflexe que SocialService.create pour patientId).
 */
@Injectable()
export class ContratsTravailService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly employesService: EmployesService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<ContratTravailEntity> {
    return this.tenantContext.getManager().getRepository(ContratTravailEntity);
  }

  async create(employeId: string, dto: CreateContratTravailDto, actingUserId: string): Promise<ContratTravailEntity> {
    await this.employesService.findById(employeId);
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const contrat = await this.repository.save(
      this.repository.create({ ...dto, etablissementId, employeId, dateFin: dto.dateFin ?? null }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'rh.contrat.create',
      ressource: 'contrat_travail',
      ressourceId: contrat.id,
    });

    return contrat;
  }

  async findAllForEmploye(employeId: string): Promise<ContratTravailEntity[]> {
    await this.employesService.findById(employeId);
    return this.repository.find({ where: { employeId }, order: { dateDebut: 'DESC' } });
  }

  async findOne(employeId: string, id: string): Promise<ContratTravailEntity> {
    await this.employesService.findById(employeId);
    const contrat = await this.repository.findOne({ where: { id, employeId } });
    if (!contrat) {
      throw new NotFoundException('Contrat de travail introuvable.');
    }
    return contrat;
  }

  async update(
    employeId: string,
    id: string,
    dto: UpdateContratTravailDto,
    actingUserId: string,
  ): Promise<ContratTravailEntity> {
    const contrat = await this.findOne(employeId, id);
    Object.assign(contrat, dto);
    const saved = await this.repository.save(contrat);

    await this.auditService.log({
      etablissementId: contrat.etablissementId,
      userId: actingUserId,
      action: 'rh.contrat.update',
      ressource: 'contrat_travail',
      ressourceId: contrat.id,
      metadata: { statut: contrat.statut },
    });

    return saved;
  }
}
