import { NotFoundException } from '@nestjs/common';
import { LogistiqueService } from './logistique.service';

describe('LogistiqueService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: LogistiqueService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'article-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    auditService = { log: jest.fn() };

    service = new LogistiqueService(tenantContext as any, auditService as any);
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

  it('findById lève NotFoundException si l’article est introuvable', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findById('inconnu')).rejects.toThrow(NotFoundException);
  });

  it('update fusionne les champs (ex. quantité) et journalise', async () => {
    repository.findOne.mockResolvedValue({ id: 'article-1', etablissementId: 'etab-1', quantite: 500 });

    const updated = await service.update('article-1', { quantite: 480 }, 'user-1');

    expect(updated.quantite).toBe(480);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'logistique.article.update' }));
  });
});
