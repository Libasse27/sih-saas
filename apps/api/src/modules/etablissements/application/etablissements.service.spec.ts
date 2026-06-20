import { EtablissementStatut, EtablissementType, StatutAutorisationCdp } from '@sih-saas/shared';
import { EtablissementsService } from './etablissements.service';

describe('EtablissementsService', () => {
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    exists: jest.Mock;
    query: jest.Mock;
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
  };
  let auditService: { log: jest.Mock };
  let service: EtablissementsService;

  function buildQueryBuilder(rawMany: unknown[] = [], rawOne: unknown = null) {
    const queryBuilder: Record<string, jest.Mock> = {};
    queryBuilder.select = jest.fn().mockReturnValue(queryBuilder);
    queryBuilder.addSelect = jest.fn().mockReturnValue(queryBuilder);
    queryBuilder.groupBy = jest.fn().mockReturnValue(queryBuilder);
    queryBuilder.getRawMany = jest.fn().mockResolvedValue(rawMany);
    queryBuilder.getRawOne = jest.fn().mockResolvedValue(rawOne);
    return queryBuilder;
  }

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'etab-1', ...entity })),
      exists: jest.fn().mockResolvedValue(false),
      query: jest.fn(),
      createQueryBuilder: jest.fn(() => buildQueryBuilder()),
      findOne: jest.fn(),
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

  describe('countParStatut', () => {
    it('renvoie 0 pour chaque statut sans ligne en base', async () => {
      const resultat = await service.countParStatut();

      expect(resultat[EtablissementStatut.ACTIF]).toBe(0);
      expect(resultat[EtablissementStatut.SUSPENDU]).toBe(0);
      expect(Object.keys(resultat)).toHaveLength(Object.values(EtablissementStatut).length);
    });

    it('agrège les comptages renvoyés par la base', async () => {
      repository.createQueryBuilder.mockReturnValue(
        buildQueryBuilder([
          { statut: EtablissementStatut.ACTIF, total: '3' },
          { statut: EtablissementStatut.SUSPENDU, total: '1' },
        ]),
      );

      const resultat = await service.countParStatut();

      expect(resultat[EtablissementStatut.ACTIF]).toBe(3);
      expect(resultat[EtablissementStatut.SUSPENDU]).toBe(1);
      expect(resultat[EtablissementStatut.ESSAI]).toBe(0);
    });
  });

  describe('sommeUsage', () => {
    it('renvoie des zéros si aucun établissement', async () => {
      const usage = await service.sommeUsage();
      expect(usage).toEqual({ utilisateurs: 0, lits: 0, stockageMo: 0 });
    });

    it('agrège les usages renvoyés par la base', async () => {
      repository.createQueryBuilder.mockReturnValue(
        buildQueryBuilder([], { utilisateurs: '12', lits: '8', stockageMo: '2048' }),
      );

      const usage = await service.sommeUsage();

      expect(usage).toEqual({ utilisateurs: 12, lits: 8, stockageMo: 2048 });
    });
  });

  describe('updateCdp (Phase 23)', () => {
    it('remplace l’intégralité du dossier CDP et journalise l’action', async () => {
      repository.findOne.mockResolvedValue({ id: 'etab-1', statutCdp: StatutAutorisationCdp.NON_INITIEE });

      const resultat = await service.updateCdp(
        'etab-1',
        {
          statut: StatutAutorisationCdp.DEMANDE_SOUMISE,
          numeroRecepisse: 'CDP-2026-001',
          dateDemande: '2026-06-20',
          commentaire: 'Soumis par le cabinet partenaire.',
        },
        'admin-1',
      );

      expect(resultat.statutCdp).toBe(StatutAutorisationCdp.DEMANDE_SOUMISE);
      expect(resultat.numeroRecepisseCdp).toBe('CDP-2026-001');
      expect(resultat.dateDecisionCdp).toBeNull();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'etablissement.cdp.update',
          ressourceId: 'etab-1',
          metadata: { statut: StatutAutorisationCdp.DEMANDE_SOUMISE },
        }),
      );
    });

    it('remet les champs optionnels absents à null plutôt que de garder les anciennes valeurs', async () => {
      repository.findOne.mockResolvedValue({
        id: 'etab-1',
        statutCdp: StatutAutorisationCdp.DEMANDE_SOUMISE,
        numeroRecepisseCdp: 'CDP-2026-001',
        commentaireCdp: 'Ancien commentaire',
      });

      const resultat = await service.updateCdp('etab-1', { statut: StatutAutorisationCdp.AUTORISEE }, 'admin-1');

      expect(resultat.numeroRecepisseCdp).toBeNull();
      expect(resultat.commentaireCdp).toBeNull();
    });
  });
});
