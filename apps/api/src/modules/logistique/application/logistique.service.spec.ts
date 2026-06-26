import { ConflictException, NotFoundException } from '@nestjs/common';
import { LogistiqueService } from './logistique.service';

describe('LogistiqueService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock; query: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock; afterCommit: jest.Mock };
  let auditService: { log: jest.Mock };
  let realtimeGateway: { emitToEtablissement: jest.Mock };
  let service: LogistiqueService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'article-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      query: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
      afterCommit: jest.fn((cb: () => void) => cb()),
    };
    auditService = { log: jest.fn() };

    realtimeGateway = { emitToEtablissement: jest.fn() };
    service = new LogistiqueService(tenantContext as any, auditService as any, realtimeGateway as any);
  });

  it('crée un article rattaché au tenant courant et journalise', async () => {
    const article = await service.create(
      { nom: 'Gants nitrile', quantite: 500, seuilAlerte: 100, unite: 'boîte' },
      'user-1',
    );

    expect(article.etablissementId).toBe('etab-1');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'logistique.article.create' }),
    );
  });

  it("findById lève NotFoundException si l'article est introuvable", async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findById('inconnu')).rejects.toThrow(NotFoundException);
  });

  it('update fusionne les champs (ex. quantité) et journalise', async () => {
    repository.findOne.mockResolvedValue({ id: 'article-1', etablissementId: 'etab-1', quantite: 500 });

    const updated = await service.update('article-1', { quantite: 480 }, 'user-1');

    expect(updated.quantite).toBe(480);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'logistique.article.update' }));
  });

  describe('decrementer', () => {
    it("décrémente atomiquement et renvoie l'article à jour", async () => {
      repository.query.mockResolvedValue([[{ id: 'article-1' }], 1]);
      repository.findOne.mockResolvedValue({ id: 'article-1', etablissementId: 'etab-1', quantite: 480, seuilAlerte: 100 });

      const article = await service.decrementer('article-1', 20);

      expect(repository.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE clinic.articles_stock'), [20, 'article-1']);
      expect(article.quantite).toBe(480);
    });

    it('lève ConflictException si le stock est insuffisant (0 ligne affectée)', async () => {
      repository.query.mockResolvedValue([[], 0]);

      await expect(service.decrementer('article-1', 9999)).rejects.toThrow(ConflictException);
    });

    it("émet stock:alerte après commit si la quantité tombe sous le seuil", async () => {
      repository.query.mockResolvedValue([[{ id: 'article-1' }], 1]);
      repository.findOne.mockResolvedValue({ id: 'article-1', etablissementId: 'etab-1', quantite: 50, seuilAlerte: 100 });

      await service.decrementer('article-1', 20);

      expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith(
        'etab-1',
        'stock:alerte',
        expect.objectContaining({ articleStockId: 'article-1', quantite: 50, seuilAlerte: 100 }),
      );
    });

    it("n'émet rien si la quantité reste au-dessus du seuil", async () => {
      repository.query.mockResolvedValue([[{ id: 'article-1' }], 1]);
      repository.findOne.mockResolvedValue({ id: 'article-1', etablissementId: 'etab-1', quantite: 480, seuilAlerte: 100 });

      await service.decrementer('article-1', 20);

      expect(realtimeGateway.emitToEtablissement).not.toHaveBeenCalled();
    });
  });
});
