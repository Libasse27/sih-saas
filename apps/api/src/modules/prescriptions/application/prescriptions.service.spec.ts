import { ConflictException } from '@nestjs/common';
import { PrescriptionStatut } from '@sih-saas/shared';
import { PrescriptionsService } from './prescriptions.service';

describe('PrescriptionsService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let lignesRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let auditService: { log: jest.Mock };
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
    };
    auditService = { log: jest.fn() };

    service = new PrescriptionsService(tenantContext as any, auditService as any);
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

  it('valider() passe EN_ATTENTE -> VALIDEE', async () => {
    repository.findOne.mockResolvedValue({ id: 'p1', etablissementId: 'etab-1', statut: PrescriptionStatut.EN_ATTENTE });
    const saved = await service.valider('p1', 'medecin-1');
    expect(saved.statut).toBe(PrescriptionStatut.VALIDEE);
  });

  it('annuler() refuse si déjà DISPENSEE', async () => {
    repository.findOne.mockResolvedValue({ id: 'p1', statut: PrescriptionStatut.DISPENSEE });
    await expect(service.annuler('p1', 'medecin-1')).rejects.toThrow(ConflictException);
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
});
