import { EtablissementType } from '@sih-saas/shared';
import { EtablissementsService } from './etablissements.service';

describe('EtablissementsService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; exists: jest.Mock; query: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: EtablissementsService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'etab-1', ...entity })),
      exists: jest.fn().mockResolvedValue(false),
      query: jest.fn(),
    };
    auditService = { log: jest.fn() };
    service = new EtablissementsService(repository as any, auditService as any);
  });

  describe('create', () => {
    it('génère un code dérivé du nom quand il est disponible', async () => {
      await service.create({ nom: 'Clinique du Plateau', type: EtablissementType.CLINIQUE }, null);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CLIN', nom: 'Clinique du Plateau' }),
      );
    });

    it('ajoute un suffixe numérique si le code de base existe déjà', async () => {
      repository.exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await service.create({ nom: 'Clinique du Plateau', type: EtablissementType.CLINIQUE }, null);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'CLIN2' }));
    });
  });

  describe('incrementerCompteur', () => {
    it('incrémente atomiquement et renvoie la nouvelle valeur', async () => {
      // TypeORM renvoie [lignes, nombreLignesAffectees] pour un UPDATE...RETURNING.
      repository.query.mockResolvedValue([[{ valeur: '1' }], 1]);

      const valeur = await service.incrementerCompteur('etab-1', 'patient');

      expect(valeur).toBe(1);
      expect(repository.query).toHaveBeenCalledWith(expect.stringContaining('jsonb_set'), [
        'etab-1',
        '{patient}',
        'patient',
      ]);
    });
  });
});
