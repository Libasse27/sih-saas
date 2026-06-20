import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { PromotionEntity } from '../infrastructure/entities/promotion.entity';
import { CreatePromotionDto } from '../presentation/dto/create-promotion.dto';
import { UpdatePromotionDto } from '../presentation/dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(PromotionEntity) private readonly repository: Repository<PromotionEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreatePromotionDto, actingUserId: string): Promise<PromotionEntity> {
    const promotion = await this.repository.save(
      this.repository.create({
        ...dto,
        regle: dto.regle ?? {},
        periodeDebut: new Date(dto.periodeDebut),
        periodeFin: new Date(dto.periodeFin),
      }),
    );

    await this.auditService.log({
      userId: actingUserId,
      action: 'promotion.create',
      ressource: 'promotion',
      ressourceId: promotion.id,
      metadata: { nom: promotion.nom },
    });

    return promotion;
  }

  async findAll(): Promise<PromotionEntity[]> {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  /** Affichage marketing public (page de tarifs) — uniquement les promotions actives dans leur période. */
  async findActives(): Promise<PromotionEntity[]> {
    const maintenant = new Date();
    return this.repository.find({
      where: { actif: true, periodeDebut: LessThanOrEqual(maintenant), periodeFin: MoreThanOrEqual(maintenant) },
      order: { periodeDebut: 'ASC' },
    });
  }

  async findById(id: string): Promise<PromotionEntity> {
    const promotion = await this.repository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException('Promotion introuvable.');
    }
    return promotion;
  }

  async update(id: string, dto: UpdatePromotionDto, actingUserId: string): Promise<PromotionEntity> {
    const promotion = await this.findById(id);
    Object.assign(promotion, {
      ...dto,
      periodeDebut: dto.periodeDebut ? new Date(dto.periodeDebut) : promotion.periodeDebut,
      periodeFin: dto.periodeFin ? new Date(dto.periodeFin) : promotion.periodeFin,
    });
    const saved = await this.repository.save(promotion);

    await this.auditService.log({
      userId: actingUserId,
      action: 'promotion.update',
      ressource: 'promotion',
      ressourceId: promotion.id,
      metadata: { nom: promotion.nom },
    });

    return saved;
  }

  async setActif(id: string, actif: boolean, actingUserId: string): Promise<PromotionEntity> {
    const promotion = await this.findById(id);
    promotion.actif = actif;
    const saved = await this.repository.save(promotion);

    await this.auditService.log({
      userId: actingUserId,
      action: actif ? 'promotion.activer' : 'promotion.desactiver',
      ressource: 'promotion',
      ressourceId: promotion.id,
    });

    return saved;
  }
}
