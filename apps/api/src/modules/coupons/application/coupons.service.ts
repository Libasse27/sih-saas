import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeReduction } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { CouponEntity } from '../infrastructure/entities/coupon.entity';
import { CreateCouponDto } from '../presentation/dto/create-coupon.dto';
import { UpdateCouponDto } from '../presentation/dto/update-coupon.dto';

export interface CouponApplicationResult {
  coupon: CouponEntity;
  montant: number;
}

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(CouponEntity) private readonly repository: Repository<CouponEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateCouponDto, actingUserId: string): Promise<CouponEntity> {
    const code = dto.code.toUpperCase();
    const existing = await this.repository.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException(`Un coupon avec le code "${code}" existe déjà.`);
    }

    const coupon = await this.repository.save(
      this.repository.create({
        ...dto,
        code,
        planIds: dto.planIds?.length ? dto.planIds : null,
        dateDebut: new Date(dto.dateDebut),
        dateFin: new Date(dto.dateFin),
        limiteUtilisation: dto.limiteUtilisation ?? -1,
      }),
    );

    await this.auditService.log({
      userId: actingUserId,
      action: 'coupon.create',
      ressource: 'coupon',
      ressourceId: coupon.id,
      metadata: { code: coupon.code },
    });

    return coupon;
  }

  async findAll(): Promise<CouponEntity[]> {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<CouponEntity> {
    const coupon = await this.repository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon introuvable.');
    }
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto, actingUserId: string): Promise<CouponEntity> {
    const coupon = await this.findById(id);
    Object.assign(coupon, {
      ...dto,
      code: dto.code ? dto.code.toUpperCase() : coupon.code,
      planIds: dto.planIds !== undefined ? (dto.planIds.length ? dto.planIds : null) : coupon.planIds,
      dateDebut: dto.dateDebut ? new Date(dto.dateDebut) : coupon.dateDebut,
      dateFin: dto.dateFin ? new Date(dto.dateFin) : coupon.dateFin,
    });
    const saved = await this.repository.save(coupon);

    await this.auditService.log({
      userId: actingUserId,
      action: 'coupon.update',
      ressource: 'coupon',
      ressourceId: coupon.id,
      metadata: { code: coupon.code },
    });

    return saved;
  }

  async setActif(id: string, actif: boolean, actingUserId: string): Promise<CouponEntity> {
    const coupon = await this.findById(id);
    coupon.actif = actif;
    const saved = await this.repository.save(coupon);

    await this.auditService.log({
      userId: actingUserId,
      action: actif ? 'coupon.activer' : 'coupon.desactiver',
      ressource: 'coupon',
      ressourceId: coupon.id,
    });

    return saved;
  }

  /** Aperçu sans effet de bord — utilisé par GET /coupons/valider/:code (public, checkout). */
  async valider(code: string, planId?: string): Promise<CouponEntity> {
    const coupon = await this.repository.findOne({ where: { code: code.toUpperCase() } });
    if (!coupon) {
      throw new NotFoundException('Coupon introuvable.');
    }
    if (!coupon.actif) {
      throw new BadRequestException('Ce coupon n\'est plus actif.');
    }
    const maintenant = new Date();
    if (maintenant < coupon.dateDebut || maintenant > coupon.dateFin) {
      throw new BadRequestException('Ce coupon n\'est pas valide à cette date.');
    }
    if (coupon.limiteUtilisation !== -1 && coupon.utilisationsCount >= coupon.limiteUtilisation) {
      throw new BadRequestException('Ce coupon a atteint sa limite d\'utilisation.');
    }
    if (planId && coupon.planIds?.length && !coupon.planIds.includes(planId)) {
      throw new BadRequestException('Ce coupon n\'est pas applicable à ce forfait.');
    }
    return coupon;
  }

  /**
   * Valide puis incrémente `utilisationsCount` de façon atomique (même pattern que
   * StockMedicamentService.decrementer, Phase 7) — sans ça, deux paiements concurrents sur le
   * dernier usage d'un coupon à limite=1 pourraient tous les deux passer la validation en lecture.
   */
  async appliquer(code: string, planId: string, montantBase: number): Promise<CouponApplicationResult> {
    const coupon = await this.valider(code, planId);

    const [lignes]: [Array<{ id: string }>, number] = await this.repository.query(
      `UPDATE platform.coupons SET utilisations_count = utilisations_count + 1
       WHERE id = $1 AND (limite_utilisation = -1 OR utilisations_count < limite_utilisation)
       RETURNING id`,
      [coupon.id],
    );
    if (!lignes.length) {
      throw new BadRequestException('Ce coupon a atteint sa limite d\'utilisation.');
    }

    coupon.utilisationsCount += 1;
    return { coupon, montant: this.calculerMontantApresReduction(montantBase, coupon) };
  }

  private calculerMontantApresReduction(montant: number, coupon: CouponEntity): number {
    const reduction =
      coupon.typeReduction === TypeReduction.POURCENTAGE ? montant * (Number(coupon.valeur) / 100) : Number(coupon.valeur);
    return Math.max(0, Math.round((montant - reduction) * 100) / 100);
  }
}
