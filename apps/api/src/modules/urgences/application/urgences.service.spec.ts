import { BadRequestException, ConflictException } from '@nestjs/common';
import { AlerteUrgenceStatut, IssueUrgence, NiveauTriage, UrgenceStatut } from '@sih-saas/shared';
import { UrgencesService } from './urgences.service';

describe('UrgencesService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let triagesRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let surveillancesRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let alertesRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock; afterCommit: jest.Mock };
  let patientsService: { findById: jest.Mock };
  let admissionsService: { create: jest.Mock };
  let servicesService: { findByCode: jest.Mock };
  let auditService: { log: jest.Mock };
  let realtimeGateway: { emitToEtablissement: jest.Mock };
  let service: UrgencesService;

  const repositoriesByEntity: Record<string, unknown> = {};

  beforeEach(() => {
    repository = { create: jest.fn((e) => e), save: jest.fn((e) => ({ id: 'urgence-1', ...e })), findOne: jest.fn(), findAndCount: jest.fn() };
    triagesRepository = { create: jest.fn((e) => e), save: jest.fn((e) => ({ id: 'triage-1', ...e })), find: jest.fn().mockResolvedValue([]) };
    surveillancesRepository = {
      create: jest.fn((e) => e),
      save: jest.fn((e) => ({ id: 'surveillance-1', ...e })),
      find: jest.fn().mockResolvedValue([]),
    };
    alertesRepository = {
      create: jest.fn((e) => e),
      save: jest.fn((e) => ({ id: 'alerte-1', ...e })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };

    repositoriesByEntity['UrgenceEntity'] = repository;
    repositoriesByEntity['TriageEntity'] = triagesRepository;
    repositoriesByEntity['SurveillanceUrgenceEntity'] = surveillancesRepository;
    repositoriesByEntity['AlerteMedicaleEntity'] = alertesRepository;

    tenantContext = {
      getManager: jest.fn(() => ({
        getRepository: (entity: { name: string }) => repositoriesByEntity[entity.name],
      })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
      afterCommit: jest.fn((callback: () => void) => callback()),
    };
    patientsService = { findById: jest.fn().mockResolvedValue({ id: 'patient-1', etablissementId: 'etab-1' }) };
    admissionsService = { create: jest.fn().mockResolvedValue({ id: 'admission-1' }) };
    servicesService = { findByCode: jest.fn().mockResolvedValue({ id: 'service-urgences' }) };
    auditService = { log: jest.fn() };
    realtimeGateway = { emitToEtablissement: jest.fn() };

    service = new UrgencesService(
      tenantContext as any,
      patientsService as any,
      admissionsService as any,
      servicesService as any,
      auditService as any,
      realtimeGateway as any,
    );
  });

  describe('create', () => {
    const dto = { patientId: 'patient-1', motif: 'Douleur thoracique', niveauTriage: NiveauTriage.URGENT };

    it('résout le service "URGENCES" par code et crée l’urgence EN_ATTENTE + un premier triage, journalise et diffuse', async () => {
      const urgence = await service.create(dto, 'user-1');

      expect(servicesService.findByCode).toHaveBeenCalledWith('URGENCES');
      expect(urgence.statut).toBe(UrgenceStatut.EN_ATTENTE);
      expect(urgence.serviceId).toBe('service-urgences');
      expect(triagesRepository.save).toHaveBeenCalledWith(expect.objectContaining({ niveau: NiveauTriage.URGENT, effectueParId: 'user-1' }));
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'urgence.create' }));
      expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith('etab-1', 'urgence:nouvelle', expect.anything());
    });

    it('refuse si le service "URGENCES" n’est pas provisionné pour cet établissement', async () => {
      servicesService.findByCode.mockResolvedValue(null);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('trier', () => {
    it('refuse si l’épisode est déjà clôturé', async () => {
      repository.findOne.mockResolvedValue({ id: 'urgence-1', statut: UrgenceStatut.SORTIE, etablissementId: 'etab-1' });

      await expect(service.trier('urgence-1', { niveau: NiveauTriage.VITAL }, 'user-1')).rejects.toThrow(ConflictException);
    });

    it('ajoute un nouveau triage et met à jour le niveau courant', async () => {
      repository.findOne.mockResolvedValue({ id: 'urgence-1', statut: UrgenceStatut.EN_ATTENTE, etablissementId: 'etab-1', niveauTriage: NiveauTriage.URGENT });

      const urgence = await service.trier('urgence-1', { niveau: NiveauTriage.VITAL }, 'user-1');

      expect(urgence.niveauTriage).toBe(NiveauTriage.VITAL);
      expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith('etab-1', 'urgence:triage-maj', expect.anything());
    });
  });

  describe('priseEnCharge', () => {
    it('assigne le médecin courant et passe l’urgence en EN_COURS', async () => {
      repository.findOne.mockResolvedValue({ id: 'urgence-1', statut: UrgenceStatut.EN_ATTENTE, etablissementId: 'etab-1' });

      const urgence = await service.priseEnCharge('urgence-1', 'medecin-1');

      expect(urgence.medecinPriseEnChargeId).toBe('medecin-1');
      expect(urgence.statut).toBe(UrgenceStatut.EN_COURS);
    });
  });

  describe('ajouterSurveillance', () => {
    it('enregistre un relevé de surveillance lié à l’urgence', async () => {
      repository.findOne.mockResolvedValue({ id: 'urgence-1', statut: UrgenceStatut.EN_COURS, etablissementId: 'etab-1' });

      const surveillance = await service.ajouterSurveillance('urgence-1', { pouls: 88 }, 'infirmier-1');

      expect(surveillance).toEqual(expect.objectContaining({ pouls: 88, releveParId: 'infirmier-1' }));
    });
  });

  describe('creerAlerte / acquitterAlerte', () => {
    it('lève une alerte et la diffuse immédiatement (pas après commit)', async () => {
      repository.findOne.mockResolvedValue({ id: 'urgence-1', statut: UrgenceStatut.EN_COURS, etablissementId: 'etab-1', patientId: 'patient-1' });

      await service.creerAlerte('urgence-1', { type: 'DETRESSE_VITALE', message: 'Désaturation brutale' }, 'medecin-1');

      expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith('etab-1', 'urgence:alerte', expect.objectContaining({ urgenceId: 'urgence-1' }));
    });

    it('refuse d’acquitter une alerte déjà acquittée', async () => {
      repository.findOne.mockResolvedValue({ id: 'urgence-1', statut: UrgenceStatut.EN_COURS, etablissementId: 'etab-1' });
      alertesRepository.findOne.mockResolvedValue({ id: 'alerte-1', urgenceId: 'urgence-1', statut: AlerteUrgenceStatut.ACQUITTEE });

      await expect(service.acquitterAlerte('urgence-1', 'alerte-1', 'medecin-1')).rejects.toThrow(ConflictException);
    });

    it('acquitte une alerte EN_COURS', async () => {
      repository.findOne.mockResolvedValue({ id: 'urgence-1', statut: UrgenceStatut.EN_COURS, etablissementId: 'etab-1' });
      alertesRepository.findOne.mockResolvedValue({ id: 'alerte-1', urgenceId: 'urgence-1', statut: AlerteUrgenceStatut.EN_COURS });

      const alerte = await service.acquitterAlerte('urgence-1', 'alerte-1', 'medecin-1');

      expect(alerte.statut).toBe(AlerteUrgenceStatut.ACQUITTEE);
      expect(alerte.acquitteeParId).toBe('medecin-1');
    });
  });

  describe('cloturer', () => {
    it('refuse un transfert sans serviceId', async () => {
      repository.findOne.mockResolvedValue({ id: 'urgence-1', statut: UrgenceStatut.EN_COURS, etablissementId: 'etab-1' });

      await expect(
        service.cloturer('urgence-1', { issue: IssueUrgence.TRANSFERT_HOSPITALISATION }, 'medecin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse un transfert sans médecin référent disponible', async () => {
      repository.findOne.mockResolvedValue({ id: 'urgence-1', statut: UrgenceStatut.EN_COURS, etablissementId: 'etab-1', medecinPriseEnChargeId: null });

      await expect(
        service.cloturer('urgence-1', { issue: IssueUrgence.TRANSFERT_HOSPITALISATION, serviceId: 'service-hospit' }, 'medecin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('transfère vers hospitalisation en créant une vraie admission', async () => {
      repository.findOne.mockResolvedValue({
        id: 'urgence-1',
        statut: UrgenceStatut.EN_COURS,
        etablissementId: 'etab-1',
        patientId: 'patient-1',
        motif: 'Douleur thoracique',
        medecinPriseEnChargeId: 'medecin-1',
      });

      const urgence = await service.cloturer(
        'urgence-1',
        { issue: IssueUrgence.TRANSFERT_HOSPITALISATION, serviceId: 'service-hospit', litId: 'lit-1' },
        'medecin-1',
      );

      expect(admissionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'patient-1', serviceId: 'service-hospit', medecinReferentId: 'medecin-1' }),
        'medecin-1',
      );
      expect(urgence.statut).toBe(UrgenceStatut.TRANSFEREE);
      expect(urgence.admissionId).toBe('admission-1');
    });

    it('clôture en SORTIE sans créer d’admission', async () => {
      repository.findOne.mockResolvedValue({ id: 'urgence-1', statut: UrgenceStatut.EN_COURS, etablissementId: 'etab-1' });

      const urgence = await service.cloturer('urgence-1', { issue: IssueUrgence.SORTIE }, 'medecin-1');

      expect(admissionsService.create).not.toHaveBeenCalled();
      expect(urgence.statut).toBe(UrgenceStatut.SORTIE);
      expect(urgence.dateSortie).toBeInstanceOf(Date);
    });

    it('refuse de clôturer un épisode déjà clôturé', async () => {
      repository.findOne.mockResolvedValue({ id: 'urgence-1', statut: UrgenceStatut.DECES, etablissementId: 'etab-1' });

      await expect(service.cloturer('urgence-1', { issue: IssueUrgence.SORTIE }, 'medecin-1')).rejects.toThrow(ConflictException);
    });
  });
});
