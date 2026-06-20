import { NotFoundException } from '@nestjs/common';
import { PromotionEntity } from '../infrastructure/entities/promotion.entity';
import { PromotionsService } from './promotions.service';

describe('PromotionsService', () => {
  let repository: { findOne: jest.Mock; find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: PromotionsService;

  const buildPromotion = (overrides: Partial<PromotionEntity> = {}): PromotionEntity =>
    ({
      id: 'promo-1',
      nom: 'Lancement Q3',
      description: null,
      regle: {},
      periodeDebut: new Date(Date.now() - 86_400_000),
      periodeFin: new Date(Date.now() + 86_400_000),
      actif: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as PromotionEntity;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => entity),
    };
    auditService = { log: jest.fn() };
    service = new PromotionsService(repository as any, auditService as any);
  });

  it('rejette une promotion introuvable', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findById('inconnu')).rejects.toThrow(NotFoundException);
  });

  it('findActives ne requête que les promotions actives dans leur période', async () => {
    repository.find.mockResolvedValue([buildPromotion()]);

    const actives = await service.findActives();

    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ actif: true }) }),
    );
    expect(actives).toHaveLength(1);
  });

  it('create stocke regle telle que fournie sans interprétation', async () => {
    const regle = { description: 'libre, jamais évalué par le backend' };

    const promotion = await service.create(
      { nom: 'Test', regle, periodeDebut: new Date().toISOString(), periodeFin: new Date().toISOString() },
      'admin-1',
    );

    expect(promotion.regle).toEqual(regle);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'promotion.create' }));
  });
});
