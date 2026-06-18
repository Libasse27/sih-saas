import { ConflictException } from '@nestjs/common';
import { PlanEntity } from '../infrastructure/entities/plan.entity';
import { PlansService } from './plans.service';

describe('PlansService', () => {
  let repository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let service: PlansService;

  const buildPlan = (overrides: Partial<PlanEntity> = {}): PlanEntity =>
    ({
      id: 'plan-1',
      code: 'STANDARD',
      nom: 'Standard',
      description: null,
      tarifs: { mensuel: 50000, annuel: 540000, devise: 'XOF' },
      limites: { maxUtilisateurs: 10, maxLits: 20, maxStockageMo: 1024 },
      modules: [],
      features: { supportPrioritaire: false, apiAccess: false, multiSites: false },
      essaiGratuitJours: 0,
      visible: true,
      actif: true,
      ordreAffichage: 0,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as PlanEntity;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => entity),
    };
    service = new PlansService(repository as any);
  });

  it('rejette la création d’un plan dont le code existe déjà', async () => {
    repository.findOne.mockResolvedValue(buildPlan());

    await expect(
      service.create({
        code: 'STANDARD',
        nom: 'Standard',
        tarifs: { mensuel: 1, annuel: 1, devise: 'XOF' },
        limites: { maxUtilisateurs: 1, maxLits: 1, maxStockageMo: 1 },
        modules: [],
        features: { supportPrioritaire: false, apiAccess: false, multiSites: false },
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('met en cache le catalogue public et ne réinterroge pas le repository tant que le TTL n’a pas expiré', async () => {
    repository.find.mockResolvedValue([buildPlan()]);

    await service.findPublic();
    await service.findPublic();

    expect(repository.find).toHaveBeenCalledTimes(1);
  });

  it('invalide le cache public après une mise à jour', async () => {
    repository.find.mockResolvedValue([buildPlan()]);
    repository.findOne.mockResolvedValue(buildPlan());

    await service.findPublic();
    await service.update('plan-1', { nom: 'Standard+' });
    await service.findPublic();

    expect(repository.find).toHaveBeenCalledTimes(2);
  });

  it('incrémente la version du plan à chaque mise à jour', async () => {
    repository.findOne.mockResolvedValue(buildPlan({ version: 3 }));

    const updated = await service.update('plan-1', { nom: 'Standard+' });

    expect(updated.version).toBe(4);
  });
});
