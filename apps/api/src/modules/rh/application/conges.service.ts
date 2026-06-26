import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CongeStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { EmployesService } from './employes.service';
import { CongeEntity } from '../infrastructure/entities/conge.entity';
import { CreateCongeDto } from '../presentation/dto/create-conge.dto';

/**
 * `clinic.conges` est protégée par RLS. C'est RH qui saisit la demande (pas de self-service employé,
 * aucun rôle "employé" générique dans ce système) — voir conges.controller.ts (tout sous `rh:manage`).
 */
@Injectable()
export class CongesService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly employesService: EmployesService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<CongeEntity> {
    return this.tenantContext.getManager().getRepository(CongeEntity);
  }

  async create(employeId: string, dto: CreateCongeDto, actingUserId: string): Promise<CongeEntity> {
    await this.employesService.findById(employeId);
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const conge = await this.repository.save(
      this.repository.create({ ...dto, etablissementId, employeId, motif: dto.motif ?? null }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'rh.conge.create',
      ressource: 'conge',
      ressourceId: conge.id,
    });

    return conge;
  }

  async findAllForEmploye(employeId: string): Promise<CongeEntity[]> {
    await this.employesService.findById(employeId);
    return this.repository.find({ where: { employeId }, order: { dateDebut: 'DESC' } });
  }

  async findById(id: string): Promise<CongeEntity> {
    const conge = await this.repository.findOne({ where: { id } });
    if (!conge) {
      throw new NotFoundException('Demande de congé introuvable.');
    }
    return conge;
  }

  async valider(id: string, actingUserId: string): Promise<CongeEntity> {
    const conge = await this.transitionner(id, CongeStatut.APPROUVE, actingUserId);

    await this.auditService.log({
      etablissementId: conge.etablissementId,
      userId: actingUserId,
      action: 'rh.conge.valider',
      ressource: 'conge',
      ressourceId: conge.id,
    });

    return conge;
  }

  async rejeter(id: string, actingUserId: string): Promise<CongeEntity> {
    const conge = await this.transitionner(id, CongeStatut.REJETE, actingUserId);

    await this.auditService.log({
      etablissementId: conge.etablissementId,
      userId: actingUserId,
      action: 'rh.conge.rejeter',
      ressource: 'conge',
      ressourceId: conge.id,
    });

    return conge;
  }

  /** DEMANDE -> APPROUVE/REJETE uniquement — toute autre transition (déjà tranchée/annulée) est un conflit. */
  private async transitionner(id: string, statut: CongeStatut, actingUserId: string): Promise<CongeEntity> {
    const conge = await this.findById(id);
    if (conge.statut !== CongeStatut.DEMANDE) {
      throw new ConflictException(
        `Cette demande de congé a déjà été traitée (statut actuel : ${conge.statut}).`,
      );
    }

    conge.statut = statut;
    conge.valideParUserId = actingUserId;
    conge.dateValidation = new Date();

    return this.repository.save(conge);
  }
}
