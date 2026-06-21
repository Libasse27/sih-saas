import { ConflictException } from '@nestjs/common';
import { PrescriptionStatut } from '@sih-saas/shared';
import { PrescriptionsService } from './prescriptions.service';

describe('PrescriptionsService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let lignesRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock; afterCommit: jest.Mock };
  let auditService: { log: jest.Mock };
  let patientsService: { findById: jest.Mock };
  let realtimeGateway: { emitToEtablissement: jest.Mock };
  let pushNotificationsService: { envoyerATousLesAppareils: jest.Mock };
  let service: PrescriptionsService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => (Array.isArray(entity) ? entity : { id: 'prescription-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    lignesRepository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entities) => entities.map((e: object, i: number) => ({ id: `ligne-${i}`, ...e }))),
      find: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({
        getRepository: (entity: { name: string }) =>
          entity.name === 'PrescriptionLigneEntity' ? lignesRepository : repository,
      })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
      afterCommit: jest.fn((callback: () => void) => callback()),
    };
    auditService = { log: jest.fn() };
    patientsService = { findById: jest.fn().mockResolvedValue({ id: 'patient-1', userId: 'user-patient-1' }) };
    realtimeGateway = { emitToEtablissement: jest.fn() };
    pushNotificationsService = { envoyerATousLesAppareils: jest.fn().mockResolvedValue(undefined) };

    service = new PrescriptionsService(
      tenantContext as any,
      auditService as any,
      patientsService as any,
      realtimeGateway as any,
      pushNotificationsService as any,
    );
  });

  const dto = {
    lignes: [{ medicamentId: 'med-1', posologie: '1cp matin', duree: '7 jours', voie: 'orale' }],
  };

  it('crée la prescription EN_ATTENTE avec ses lignes, journalise', async () => {
    const { prescription, lignes } = await service.create('patient-1', dto, 'medecin-1');

    expect(prescription.statut).toBe(PrescriptionStatut.EN_ATTENTE);
    expect(prescription.patientId).toBe('patient-1');
    expect(lignes).toHaveLength(1);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'prescription.create' }));
  });

  it('valider() refuse si la prescription n’est pas EN_ATTENTE', async () => {
    repository.findOne.mockResolvedValue({ id: 'p1', statut: PrescriptionStatut.VALIDEE });
    await expect(service.valider('p1', 'medecin-1')).rejects.toThrow(ConflictException);
  });

  it('valider() passe EN_ATTENTE -> VALIDEE, notifie la pharmacie (tenant) et le patient', async () => {
    repository.findOne.mockResolvedValue({
      id: 'p1',
      etablissementId: 'etab-1',
      patientId: 'patient-1',
      statut: PrescriptionStatut.EN_ATTENTE,
    });
    const saved = await service.valider('p1', 'medecin-1');
    expect(saved.statut).toBe(PrescriptionStatut.VALIDEE);
    expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith(
      'etab-1',
      'pharmacie:prescription.validee',
      expect.objectContaining({ prescriptionId: 'p1' }),
    );
    expect(pushNotificationsService.envoyerATousLesAppareils).toHaveBeenCalledWith('user-patient-1', expect.anything());
  });

  it('annuler() refuse si déjà DISPENSEE', async () => {
    repository.findOne.mockResolvedValue({ id: 'p1', statut: PrescriptionStatut.DISPENSEE });
    await expect(service.annuler('p1', 'medecin-1')).rejects.toThrow(ConflictException);
  });

  it('annuler() notifie le patient', async () => {
    repository.findOne.mockResolvedValue({
      id: 'p1',
      etablissementId: 'etab-1',
      patientId: 'patient-1',
      statut: PrescriptionStatut.EN_ATTENTE,
    });
    await service.annuler('p1', 'medecin-1');
    expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith('etab-1', 'pharmacie:prescription.annulee', expect.anything());
    expect(pushNotificationsService.envoyerATousLesAppareils).toHaveBeenCalledWith('user-patient-1', expect.anything());
  });

  it('marquerDispensee() exige le statut VALIDEE', async () => {
    repository.findOne.mockResolvedValue({ id: 'p1', statut: PrescriptionStatut.EN_ATTENTE });
    await expect(service.marquerDispensee('p1')).rejects.toThrow(ConflictException);
  });

  it('marquerDispensee() passe VALIDEE -> DISPENSEE', async () => {
    repository.findOne.mockResolvedValue({ id: 'p1', etablissementId: 'etab-1', statut: PrescriptionStatut.VALIDEE });
    const saved = await service.marquerDispensee('p1');
    expect(saved.statut).toBe(PrescriptionStatut.DISPENSEE);
  });

  describe('findAll (file de travail transversale, Phase 18)', () => {
    it('liste toutes les prescriptions de l’établissement sans filtre patient', async () => {
      await service.findAll(1, 20);
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('filtre par statut quand fourni', async () => {
      await service.findAll(1, 20, { statut: PrescriptionStatut.VALIDEE });
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { statut: PrescriptionStatut.VALIDEE } }),
      );
    });
  });
});
