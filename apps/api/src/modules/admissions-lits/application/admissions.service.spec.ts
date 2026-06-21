import { BadRequestException, ConflictException } from '@nestjs/common';
import { AdmissionStatut } from '@sih-saas/shared';
import { AdmissionsService } from './admissions.service';

describe('AdmissionsService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let mouvementsRepository: { create: jest.Mock; save: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock; afterCommit: jest.Mock };
  let patientsService: { findById: jest.Mock };
  let litsService: { findById: jest.Mock; assigner: jest.Mock; liberer: jest.Mock };
  let auditService: { log: jest.Mock };
  let realtimeGateway: { emitToEtablissement: jest.Mock };
  let pushNotificationsService: { envoyerATousLesAppareils: jest.Mock };
  let service: AdmissionsService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'admission-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    mouvementsRepository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'mouvement-1', ...entity })),
    };
    tenantContext = {
      getManager: jest.fn(() => ({
        getRepository: (entity: { name: string }) =>
          entity.name === 'MouvementPatientEntity' ? mouvementsRepository : repository,
      })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
      afterCommit: jest.fn((callback: () => void) => callback()),
    };
    patientsService = {
      findById: jest.fn().mockResolvedValue({ id: 'patient-1', etablissementId: 'etab-1', userId: 'user-patient-1' }),
    };
    litsService = {
      findById: jest.fn().mockResolvedValue({ id: 'lit-1', serviceId: 'service-1', statut: 'LIBRE' }),
      assigner: jest.fn().mockResolvedValue(undefined),
      liberer: jest.fn().mockResolvedValue(undefined),
    };
    auditService = { log: jest.fn() };
    realtimeGateway = { emitToEtablissement: jest.fn() };
    pushNotificationsService = { envoyerATousLesAppareils: jest.fn().mockResolvedValue(undefined) };

    service = new AdmissionsService(
      tenantContext as any,
      patientsService as any,
      litsService as any,
      auditService as any,
      realtimeGateway as any,
      pushNotificationsService as any,
    );
  });

  describe('create', () => {
    const dto = { patientId: 'patient-1', serviceId: 'service-1', litId: 'lit-1', medecinReferentId: 'medecin-1', motif: 'Fièvre' };

    it('refuse si le lit indiqué n’appartient pas au service de l’admission', async () => {
      litsService.findById.mockResolvedValue({ id: 'lit-1', serviceId: 'AUTRE_SERVICE' });

      await expect(service.create(dto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('crée l’admission, assigne le lit et journalise un mouvement ENTREE', async () => {
      const admission = await service.create(dto, 'user-1');

      expect(admission.statut).toBe(AdmissionStatut.EN_COURS);
      expect(litsService.assigner).toHaveBeenCalledWith('lit-1', 'patient-1', 'user-1');
      expect(mouvementsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ENTREE', litDestinationId: 'lit-1' }),
      );
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'admission.create' }));
      expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith('etab-1', 'admission:cree', expect.objectContaining({ patientId: 'patient-1' }));
      expect(pushNotificationsService.envoyerATousLesAppareils).toHaveBeenCalledWith(
        'user-patient-1',
        expect.objectContaining({ data: { admissionId: 'admission-1' } }),
      );
    });

    it('fonctionne sans lit (admission sans affectation immédiate)', async () => {
      await service.create({ ...dto, litId: undefined }, 'user-1');
      expect(litsService.assigner).not.toHaveBeenCalled();
    });
  });

  describe('transfert', () => {
    it('refuse si l’admission n’est pas en cours', async () => {
      repository.findOne.mockResolvedValue({ id: 'admission-1', statut: AdmissionStatut.TERMINEE });

      await expect(service.transfert('admission-1', { litDestinationId: 'lit-2' }, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('libère l’ancien lit et assigne le nouveau, journalise un mouvement TRANSFERT', async () => {
      repository.findOne.mockResolvedValue({
        id: 'admission-1',
        statut: AdmissionStatut.EN_COURS,
        patientId: 'patient-1',
        etablissementId: 'etab-1',
        serviceId: 'service-1',
        litId: 'lit-1',
      });
      litsService.findById.mockResolvedValue({ id: 'lit-2', serviceId: 'service-2' });

      await service.transfert('admission-1', { litDestinationId: 'lit-2' }, 'user-1');

      expect(litsService.liberer).toHaveBeenCalledWith('lit-1', 'user-1');
      expect(litsService.assigner).toHaveBeenCalledWith('lit-2', 'patient-1', 'user-1');
      expect(mouvementsRepository.save).toHaveBeenCalledWith(expect.objectContaining({ type: 'TRANSFERT' }));
      expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith('etab-1', 'admission:transfert', expect.objectContaining({ patientId: 'patient-1' }));
      expect(pushNotificationsService.envoyerATousLesAppareils).toHaveBeenCalledWith('user-patient-1', expect.anything());
    });
  });

  describe('sortie', () => {
    it('libère le lit, clôture l’admission et journalise un mouvement SORTIE', async () => {
      repository.findOne.mockResolvedValue({
        id: 'admission-1',
        statut: AdmissionStatut.EN_COURS,
        patientId: 'patient-1',
        etablissementId: 'etab-1',
        serviceId: 'service-1',
        litId: 'lit-1',
      });

      const admission = await service.sortie('admission-1', 'user-1');

      expect(litsService.liberer).toHaveBeenCalledWith('lit-1', 'user-1');
      expect(admission.statut).toBe(AdmissionStatut.TERMINEE);
      expect(admission.dateSortieReelle).toBeInstanceOf(Date);
      expect(mouvementsRepository.save).toHaveBeenCalledWith(expect.objectContaining({ type: 'SORTIE' }));
      expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith('etab-1', 'admission:sortie', expect.objectContaining({ patientId: 'patient-1' }));
      expect(pushNotificationsService.envoyerATousLesAppareils).toHaveBeenCalledWith('user-patient-1', expect.anything());
    });
  });
});
