import { AuditService } from './audit.service';

describe('AuditService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findAndCount: jest.Mock };
  let service: AuditService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn().mockResolvedValue(undefined),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    service = new AuditService(repository as any);
  });

  it('log() persiste une entrée avec les valeurs par défaut pour les champs absents', async () => {
    await service.log({ action: 'etablissement.create' });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'etablissement.create', etablissementId: null, userId: null }),
    );
    expect(repository.save).toHaveBeenCalled();
  });

  describe('findAll', () => {
    it('pagine sans filtre établissement', async () => {
      repository.findAndCount.mockResolvedValue([[{ id: 'log-1' }], 1]);

      const resultat = await service.findAll(1, 20);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, skip: 0, take: 20 }),
      );
      expect(resultat).toEqual({ items: [{ id: 'log-1' }], page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('filtre par établissement quand précisé', async () => {
      await service.findAll(2, 10, 'etab-1');

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { etablissementId: 'etab-1' }, skip: 10, take: 10 }),
      );
    });
  });
});
