import { NotFoundException } from '@nestjs/common';
import { MedicamentsCatalogueService } from './medicaments-catalogue.service';

describe('MedicamentsCatalogueService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let service: MedicamentsCatalogueService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'med-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    service = new MedicamentsCatalogueService(repository as any);
  });

  it('crée une entrée de catalogue (référentiel partagé, pas de etablissementId)', async () => {
    const medicament = await service.create({ dci: 'Paracétamol', forme: 'comprimé', dosage: '500mg' });

    expect(medicament).not.toHaveProperty('etablissementId');
    expect(medicament.dci).toBe('Paracétamol');
  });

  it('findById lève NotFoundException si introuvable', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findById('inconnu')).rejects.toThrow(NotFoundException);
  });
});
