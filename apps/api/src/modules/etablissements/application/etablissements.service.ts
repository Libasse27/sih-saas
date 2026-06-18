import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EtablissementStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { EtablissementEntity, EtablissementUsage } from '../infrastructure/entities/etablissement.entity';
import { CreateEtablissementDto } from '../presentation/dto/create-etablissement.dto';

@Injectable()
export class EtablissementsService {
  constructor(
    @InjectRepository(EtablissementEntity)
    private readonly repository: Repository<EtablissementEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateEtablissementDto, actingUserId: string): Promise<EtablissementEntity> {
    const etablissement = await this.repository.save(this.repository.create(dto));

    await this.auditService.log({
      etablissementId: etablissement.id,
      userId: actingUserId,
      action: 'etablissement.create',
      ressource: 'etablissement',
      ressourceId: etablissement.id,
    });

    return etablissement;
  }

  async findAll(page: number, limit: number) {
    const [items, total] = await this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<EtablissementEntity> {
    const etablissement = await this.repository.findOne({ where: { id } });
    if (!etablissement) {
      throw new NotFoundException('Établissement introuvable.');
    }
    return etablissement;
  }

  async updateStatut(
    id: string,
    statut: EtablissementStatut,
    actingUserId: string | null,
  ): Promise<EtablissementEntity> {
    const etablissement = await this.findById(id);
    etablissement.statut = statut;
    await this.repository.save(etablissement);

    await this.auditService.log({
      etablissementId: etablissement.id,
      userId: actingUserId,
      action: 'etablissement.statut.update',
      ressource: 'etablissement',
      ressourceId: etablissement.id,
      metadata: { statut },
    });

    return etablissement;
  }

  /** Renseigné par SubscriptionsService après création/migration d'un abonnement. */
  async setAbonnementActif(id: string, subscriptionId: string): Promise<void> {
    await this.repository.update(id, { abonnementActifId: subscriptionId });
  }

  /** Maintient etablissement.usage en phase avec la réalité (ex. après création d'un utilisateur). */
  async incrementUsage(id: string, champ: keyof EtablissementUsage, delta: number): Promise<void> {
    const etablissement = await this.findById(id);
    etablissement.usage = {
      ...etablissement.usage,
      [champ]: Math.max(0, etablissement.usage[champ] + delta),
    };
    await this.repository.save(etablissement);
  }
}
