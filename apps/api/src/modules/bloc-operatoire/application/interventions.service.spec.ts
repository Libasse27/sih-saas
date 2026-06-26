import { ConflictException, NotFoundException } from '@nestjs/common';
import { InterventionStatut, PhaseChecklistOms, RoleEquipeOperatoire, SalleOperationStatut, TypeAnesthesie } from '@sih-saas/shared';
import { InterventionsService } from './interventions.service';

describe('InterventionsService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock; find: jest.Mock };
  let equipeRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock; remove: jest.Mock };
  let anesthesieRepository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let consommablesRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let compteRenduRepository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock; afterCommit: jest.Mock };
  let patientsService: { findById: jest.Mock };
  let admissionsService: { findById: jest.Mock };
  let sallesOperationService: { findById: jest.Mock; changerStatutOccupation: jest.Mock };
  let logistiqueService: { decrementer: jest.Mock };
  let dossierMedicalService: { ajouterCompteRendu: jest.Mock };
  let auditService: { log: jest.Mock };
  let realtimeGateway: { emitToEtablissement: jest.Mock };
  let service: InterventionsService;

  const repositoriesByEntity: Record<string, unknown> = {};

  beforeEach(() => {
    repository = {
      create: jest.fn((e) => e),
      save: jest.fn((e) => ({ id: 'intervention-1', ...e })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    equipeRepository = {
      create: jest.fn((e) => e),
      save: jest.fn((e) => ({ id: 'membre-1', ...e })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    anesthesieRepository = { create: jest.fn((e) => e), save: jest.fn((e) => ({ id: 'anesthesie-1', ...e })), findOne: jest.fn() };
    consommablesRepository = { create: jest.fn((e) => e), save: jest.fn((e) => ({ id: 'consommable-1', ...e })), find: jest.fn().mockResolvedValue([]) };
    compteRenduRepository = { create: jest.fn((e) => e), save: jest.fn((e) => ({ id: 'compte-rendu-1', ...e })), findOne: jest.fn() };

    repositoriesByEntity['InterventionEntity'] = repository;
    repositoriesByEntity['EquipeOperatoireEntity'] = equipeRepository;
    repositoriesByEntity['AnesthesieEntity'] = anesthesieRepository;
    repositoriesByEntity['ConsommableInterventionEntity'] = consommablesRepository;
    repositoriesByEntity['CompteRenduOperatoireEntity'] = compteRenduRepository;

    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: (entity: { name: string }) => repositoriesByEntity[entity.name] })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
      afterCommit: jest.fn((callback: () => void) => callback()),
    };
    patientsService = { findById: jest.fn().mockResolvedValue({ id: 'patient-1', etablissementId: 'etab-1' }) };
    admissionsService = { findById: jest.fn().mockResolvedValue({ id: 'admission-1' }) };
    sallesOperationService = {
      findById: jest.fn().mockResolvedValue({ id: 'salle-1', statut: SalleOperationStatut.LIBRE }),
      changerStatutOccupation: jest.fn().mockResolvedValue({ id: 'salle-1' }),
    };
    logistiqueService = { decrementer: jest.fn().mockResolvedValue({ id: 'article-1', quantite: 80 }) };
    dossierMedicalService = { ajouterCompteRendu: jest.fn().mockResolvedValue({}) };
    auditService = { log: jest.fn() };
    realtimeGateway = { emitToEtablissement: jest.fn() };

    service = new InterventionsService(
      tenantContext as any,
      patientsService as any,
      admissionsService as any,
      sallesOperationService as any,
      logistiqueService as any,
      dossierMedicalService as any,
      auditService as any,
      realtimeGateway as any,
    );
  });

  describe('create', () => {
    const dto = {
      patientId: 'patient-1',
      salleOperationId: 'salle-1',
      chirurgienPrincipalId: 'chirurgien-1',
      typeIntervention: 'Appendicectomie',
      dateHeurePrevue: '2026-07-01T08:00:00.000Z',
      dureeEstimeeMinutes: 60,
    };

    it('crée l’intervention PLANIFIEE, le chirurgien principal comme membre d’équipe, et journalise', async () => {
      const intervention = await service.create(dto, 'user-1');

      expect(intervention.statut).toBe(InterventionStatut.PLANIFIEE);
      expect(patientsService.findById).toHaveBeenCalledWith('patient-1');
      expect(sallesOperationService.findById).toHaveBeenCalledWith('salle-1');
      expect(equipeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'chirurgien-1', role: RoleEquipeOperatoire.CHIRURGIEN_PRINCIPAL }),
      );
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'intervention.create' }));
    });

    it('refuse un créneau qui chevauche une intervention déjà planifiée sur la même salle', async () => {
      repository.find.mockResolvedValue([
        {
          id: 'intervention-existante',
          salleOperationId: 'salle-1',
          statut: InterventionStatut.PLANIFIEE,
          dateHeurePrevue: new Date('2026-07-01T08:30:00.000Z'),
          dureeEstimeeMinutes: 60,
        },
      ]);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('annuler', () => {
    it('refuse d’annuler une intervention qui n’est plus PLANIFIEE', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.EN_COURS, etablissementId: 'etab-1' });

      await expect(service.annuler('intervention-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('annule une intervention PLANIFIEE', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.PLANIFIEE, etablissementId: 'etab-1' });

      const intervention = await service.annuler('intervention-1', 'user-1');

      expect(intervention.statut).toBe(InterventionStatut.ANNULEE);
    });
  });

  describe('retirerMembreEquipe', () => {
    it('lève NotFoundException si le membre est introuvable', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', etablissementId: 'etab-1' });
      equipeRepository.findOne.mockResolvedValue(null);

      await expect(service.retirerMembreEquipe('intervention-1', 'membre-inconnu', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('demarrer', () => {
    it('refuse si l’intervention n’est pas PLANIFIEE', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.TERMINEE, etablissementId: 'etab-1' });

      await expect(service.demarrer('intervention-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('passe l’intervention EN_COURS, occupe la salle, et diffuse après commit', async () => {
      repository.findOne.mockResolvedValue({
        id: 'intervention-1',
        statut: InterventionStatut.PLANIFIEE,
        etablissementId: 'etab-1',
        salleOperationId: 'salle-1',
      });

      const intervention = await service.demarrer('intervention-1', 'user-1');

      expect(intervention.statut).toBe(InterventionStatut.EN_COURS);
      expect(intervention.dateHeureDebutReelle).toBeInstanceOf(Date);
      expect(sallesOperationService.changerStatutOccupation).toHaveBeenCalledWith('salle-1', SalleOperationStatut.OCCUPEE);
      expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith('etab-1', 'bloc:salle.updated', expect.objectContaining({ salleOperationId: 'salle-1' }));
    });
  });

  describe('validerChecklist', () => {
    it('refuse si l’intervention n’est pas EN_COURS', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.PLANIFIEE, etablissementId: 'etab-1' });

      await expect(service.validerChecklist('intervention-1', { phase: PhaseChecklistOms.SIGN_IN }, 'user-1')).rejects.toThrow(ConflictException);
    });

    it('valide la phase signIn sans toucher aux autres phases', async () => {
      repository.findOne.mockResolvedValue({
        id: 'intervention-1',
        statut: InterventionStatut.EN_COURS,
        etablissementId: 'etab-1',
        checklistOms: {
          signIn: { valide: false, valideParId: null, valideLe: null },
          timeOut: { valide: false, valideParId: null, valideLe: null },
          signOut: { valide: false, valideParId: null, valideLe: null },
        },
      });

      const intervention = await service.validerChecklist('intervention-1', { phase: PhaseChecklistOms.SIGN_IN }, 'user-1');

      expect(intervention.checklistOms.signIn.valide).toBe(true);
      expect(intervention.checklistOms.signIn.valideParId).toBe('user-1');
      expect(intervention.checklistOms.timeOut.valide).toBe(false);
    });
  });

  describe('creerOuCompleterAnesthesie', () => {
    it('crée un premier relevé d’anesthésie si aucun n’existe', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.EN_COURS, etablissementId: 'etab-1' });
      anesthesieRepository.findOne.mockResolvedValue(null);

      const anesthesie = await service.creerOuCompleterAnesthesie('intervention-1', { type: TypeAnesthesie.GENERALE }, 'anesthesiste-1');

      expect(anesthesie.type).toBe(TypeAnesthesie.GENERALE);
      expect(anesthesie.anesthesisteId).toBe('anesthesiste-1');
    });

    it('complète le relevé existant plutôt que d’en créer un second', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.EN_COURS, etablissementId: 'etab-1' });
      anesthesieRepository.findOne.mockResolvedValue({ id: 'anesthesie-1', interventionId: 'intervention-1', scoreAsa: null, produits: [] });

      const anesthesie = await service.creerOuCompleterAnesthesie('intervention-1', { type: TypeAnesthesie.GENERALE, scoreAsa: 2 }, 'anesthesiste-1');

      expect(anesthesie.scoreAsa).toBe(2);
      expect(anesthesieRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'anesthesie-1' }));
    });
  });

  describe('ajouterSurveillanceAnesthesie', () => {
    it('lève NotFoundException si aucune anesthésie n’existe encore', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.EN_COURS, etablissementId: 'etab-1' });
      anesthesieRepository.findOne.mockResolvedValue(null);

      await expect(service.ajouterSurveillanceAnesthesie('intervention-1', { pouls: 80 }, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('ajoute un relevé à la liste existante', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.EN_COURS, etablissementId: 'etab-1' });
      anesthesieRepository.findOne.mockResolvedValue({ id: 'anesthesie-1', interventionId: 'intervention-1', surveillance: [] });

      const anesthesie = await service.ajouterSurveillanceAnesthesie('intervention-1', { pouls: 80 }, 'user-1');

      expect(anesthesie.surveillance).toHaveLength(1);
      expect(anesthesie.surveillance[0]).toEqual(expect.objectContaining({ pouls: 80 }));
    });
  });

  describe('enregistrerConsommable', () => {
    it('décrémente le stock Logistique puis consigne le consommable', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.EN_COURS, etablissementId: 'etab-1' });

      const consommable = await service.enregistrerConsommable('intervention-1', { articleStockId: 'article-1', quantite: 3 }, 'user-1');

      expect(logistiqueService.decrementer).toHaveBeenCalledWith('article-1', 3);
      expect(consommable).toEqual(expect.objectContaining({ articleStockId: 'article-1', quantite: 3 }));
    });
  });

  describe('terminer', () => {
    it('passe l’intervention TERMINEE et libère la salle', async () => {
      repository.findOne.mockResolvedValue({
        id: 'intervention-1',
        statut: InterventionStatut.EN_COURS,
        etablissementId: 'etab-1',
        salleOperationId: 'salle-1',
      });

      const intervention = await service.terminer('intervention-1', 'user-1');

      expect(intervention.statut).toBe(InterventionStatut.TERMINEE);
      expect(intervention.dateHeureFinReelle).toBeInstanceOf(Date);
      expect(sallesOperationService.changerStatutOccupation).toHaveBeenCalledWith('salle-1', SalleOperationStatut.LIBRE);
    });
  });

  describe('redigerCompteRendu', () => {
    const dto = {
      diagnosticPreOperatoire: 'Appendicite aiguë',
      diagnosticPostOperatoire: 'Appendicite confirmée',
      techniqueUtilisee: 'Cœlioscopie',
      contenu: 'Intervention sans complication.',
    };

    it('refuse si l’intervention n’est pas TERMINEE', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.EN_COURS, etablissementId: 'etab-1' });

      await expect(service.redigerCompteRendu('intervention-1', dto, 'chirurgien-1')).rejects.toThrow(ConflictException);
    });

    it('refuse un second compte rendu pour la même intervention', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.TERMINEE, etablissementId: 'etab-1', patientId: 'patient-1' });
      compteRenduRepository.findOne.mockResolvedValue({ id: 'compte-rendu-existant' });

      await expect(service.redigerCompteRendu('intervention-1', dto, 'chirurgien-1')).rejects.toThrow(ConflictException);
    });

    it('crée le compte rendu et le réplique dans le DME', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.TERMINEE, etablissementId: 'etab-1', patientId: 'patient-1' });
      compteRenduRepository.findOne.mockResolvedValue(null);

      const compteRendu = await service.redigerCompteRendu('intervention-1', dto, 'chirurgien-1');

      expect(compteRendu.redacteurId).toBe('chirurgien-1');
      expect(dossierMedicalService.ajouterCompteRendu).toHaveBeenCalledWith(
        'patient-1',
        expect.objectContaining({ auteurId: 'chirurgien-1', type: 'bloc-operatoire', contenu: dto.contenu }),
        'etab-1',
      );
    });
  });
});
