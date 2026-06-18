import { ConflictException } from '@nestjs/common';
import { StockMedicamentService } from './stock-medicament.service';

describe('StockMedicamentService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock; query: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock; afterCommit: jest.Mock };
  let auditService: { log: jest.Mock };
  let realtimeGateway: { emitToEtablissement: jest.Mock };
  let service: StockMedicamentService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'stock-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      query: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
      afterCommit: jest.fn((cb) => cb()),
    };
    auditService = { log: jest.fn() };
    realtimeGateway = { emitToEtablissement: jest.fn() };

    service = new StockMedicamentService(tenantContext as any, auditService as any, realtimeGateway as any);
  });

  describe('decrementer', () => {
    it('décrémente atomiquement et renvoie le stock à jour', async () => {
      repository.query.mockResolvedValue([[{ id: 'stock-1' }], 1]);
      repository.findOne.mockResolvedValue({
        id: 'stock-1',
        etablissementId: 'etab-1',
        quantite: 50,
        seuilAlerte: 10,
      });

      const stock = await service.decrementer('stock-1', 5);

      expect(repository.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), [5, 'stock-1']);
      expect(stock.quantite).toBe(50);
      expect(realtimeGateway.emitToEtablissement).not.toHaveBeenCalled();
    });

    it('lève ConflictException si le stock est insuffisant (0 ligne affectée)', async () => {
      repository.query.mockResolvedValue([[], 0]);

      await expect(service.decrementer('stock-1', 999)).rejects.toThrow(ConflictException);
    });

    it('émet une alerte stock:alerte après commit si la quantité tombe sous le seuil', async () => {
      repository.query.mockResolvedValue([[{ id: 'stock-1' }], 1]);
      repository.findOne.mockResolvedValue({
        id: 'stock-1',
        etablissementId: 'etab-1',
        quantite: 5,
        seuilAlerte: 10,
      });

      await service.decrementer('stock-1', 5);

      expect(tenantContext.afterCommit).toHaveBeenCalled();
      expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith(
        'etab-1',
        'stock:alerte',
        expect.objectContaining({ stockMedicamentId: 'stock-1', quantite: 5 }),
      );
    });
  });
});
