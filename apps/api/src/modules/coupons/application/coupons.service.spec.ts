import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TypeReduction } from '@sih-saas/shared';
import { CouponEntity } from '../infrastructure/entities/coupon.entity';
import { CouponsService } from './coupons.service';

describe('CouponsService', () => {
  let repository: { findOne: jest.Mock; find: jest.Mock; create: jest.Mock; save: jest.Mock; query: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: CouponsService;

  const buildCoupon = (overrides: Partial<CouponEntity> = {}): CouponEntity =>
    ({
      id: 'coupon-1',
      code: 'PROMO20',
      typeReduction: TypeReduction.POURCENTAGE,
      valeur: 20,
      description: null,
      planIds: null,
      dateDebut: new Date(Date.now() - 86_400_000),
      dateFin: new Date(Date.now() + 86_400_000),
      limiteUtilisation: -1,
      utilisationsCount: 0,
      actif: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as CouponEntity;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => entity),
      query: jest.fn(),
    };
    auditService = { log: jest.fn() };
    service = new CouponsService(repository as any, auditService as any);
  });

  describe('create', () => {
    it('met le code en majuscules et rejette un doublon', async () => {
      repository.findOne.mockResolvedValue(buildCoupon());

      await expect(
        service.create(
          {
            code: 'promo20',
            typeReduction: TypeReduction.POURCENTAGE,
            valeur: 20,
            dateDebut: new Date().toISOString(),
            dateFin: new Date().toISOString(),
          },
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('valider', () => {
    it("rejette un coupon introuvable", async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.valider('INCONNU')).rejects.toThrow(NotFoundException);
    });

    it('rejette un coupon désactivé', async () => {
      repository.findOne.mockResolvedValue(buildCoupon({ actif: false }));
      await expect(service.valider('PROMO20')).rejects.toThrow(BadRequestException);
    });

    it('rejette un coupon hors période de validité', async () => {
      repository.findOne.mockResolvedValue(
        buildCoupon({ dateDebut: new Date(Date.now() - 200_000), dateFin: new Date(Date.now() - 100_000) }),
      );
      await expect(service.valider('PROMO20')).rejects.toThrow(BadRequestException);
    });

    it('rejette un coupon dont la limite est déjà atteinte', async () => {
      repository.findOne.mockResolvedValue(buildCoupon({ limiteUtilisation: 5, utilisationsCount: 5 }));
      await expect(service.valider('PROMO20')).rejects.toThrow(BadRequestException);
    });

    it("rejette un coupon non applicable au forfait demandé", async () => {
      repository.findOne.mockResolvedValue(buildCoupon({ planIds: ['plan-autre'] }));
      await expect(service.valider('PROMO20', 'plan-1')).rejects.toThrow(BadRequestException);
    });

    it('accepte un coupon valide sans planId restrictif', async () => {
      repository.findOne.mockResolvedValue(buildCoupon({ planIds: ['plan-1'] }));
      const coupon = await service.valider('promo20', 'plan-1');
      expect(coupon.code).toBe('PROMO20');
    });
  });

  describe('appliquer', () => {
    it('incrémente atomiquement et réduit le montant (pourcentage)', async () => {
      repository.findOne.mockResolvedValue(buildCoupon({ typeReduction: TypeReduction.POURCENTAGE, valeur: 20 }));
      repository.query.mockResolvedValue([[{ id: 'coupon-1' }], 1]);

      const result = await service.appliquer('PROMO20', 'plan-1', 50000);

      expect(result.montant).toBe(40000);
      expect(repository.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE platform.coupons'), ['coupon-1']);
    });

    it('réduit le montant (montant fixe), jamais sous zéro', async () => {
      repository.findOne.mockResolvedValue(buildCoupon({ typeReduction: TypeReduction.MONTANT_FIXE, valeur: 100000 }));
      repository.query.mockResolvedValue([[{ id: 'coupon-1' }], 1]);

      const result = await service.appliquer('PROMO20', 'plan-1', 50000);

      expect(result.montant).toBe(0);
    });

    it("rejette si l'incrément atomique échoue (limite atteinte entre la validation et l'écriture)", async () => {
      repository.findOne.mockResolvedValue(buildCoupon());
      repository.query.mockResolvedValue([[], 0]);

      await expect(service.appliquer('PROMO20', 'plan-1', 50000)).rejects.toThrow(BadRequestException);
    });
  });
});
