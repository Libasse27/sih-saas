import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DemandeStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { DemandeAnalyseEntity } from '../infrastructure/entities/demande-analyse.entity';
import { CreateDemandeAnalyseDto } from '../presentation/dto/create-demande-analyse.dto';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** `clinic.demandes_analyse` est protégée par RLS — convention tenantContext.getManager(). */
@Injectable()
export class DemandesAnalyseService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<DemandeAnalyseEntity> {
    return this.tenantContext.getManager().getRepository(DemandeAnalyseEntity);
  }

  async create(patientId: string, dto: CreateDemandeAnalyseDto, prescripteurId: string): Promise<DemandeAnalyseEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const demande = await this.repository.save(
      this.repository.create({
        etablissementId,
        patientId,
        prescripteurId,
        typeAnalyse: dto.typeAnalyse,
        urgence: dto.urgence ?? false,
        statut: DemandeStatut.EN_ATTENTE,
        dateDemande: new Date(),
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: prescripteurId,
      action: 'labo.demande.create',
      ressource: 'demande_analyse',
      ressourceId: demande.id,
      metadata: { patientId, typeAnalyse: dto.typeAnalyse },
    });

    return demande;
  }

  async findById(id: string): Promise<DemandeAnalyseEntity> {
    const demande = await this.repository.findOne({ where: { id } });
    if (!demande) {
      throw new NotFoundException('Demande d’analyse introuvable.');
    }
    return demande;
  }

  /** Sans `patientId`, c'est la file de travail du laboratoire (cf. plan Phase 7, gating LABO_RESULT_WRITE). */
  async findAll(
    page: number,
    limit: number,
    filtres: { statut?: DemandeStatut; patientId?: string } = {},
  ): Promise<PaginatedResult<DemandeAnalyseEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: filtres,
      skip: (page - 1) * limit,
      take: limit,
      order: { urgence: 'DESC', dateDemande: 'ASC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async marquerEnCours(id: string): Promise<DemandeAnalyseEntity> {
    const demande = await this.findById(id);
    if (demande.statut !== DemandeStatut.EN_ATTENTE) {
      throw new ConflictException(`Seule une demande EN_ATTENTE peut passer EN_COURS (statut actuel : ${demande.statut}).`);
    }
    demande.statut = DemandeStatut.EN_COURS;
    return this.repository.save(demande);
  }

  async marquerTerminee(id: string): Promise<DemandeAnalyseEntity> {
    const demande = await this.findById(id);
    demande.statut = DemandeStatut.TERMINEE;
    return this.repository.save(demande);
  }
}
