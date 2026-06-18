import { ConflictException } from '@nestjs/common';
import { DemandeStatut } from '@sih-saas/shared';
import { DemandesImagerieService } from './demandes-imagerie.service';

describe('DemandesImagerieService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: DemandesImagerieService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'demande-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    auditService = { log: jest.fn() };

    service = new DemandesImagerieService(tenantContext as any, auditService as any);
  });

  it('crée la demande EN_ATTENTE et journalise', async () => {
    const demande = await service.create('patient-1', { typeExamen: 'Radiographie thoracique' }, 'medecin-1');

    expect(demande.statut).toBe(DemandeStatut.EN_ATTENTE);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'imagerie.demande.create' }));
  });

  it('marquerEnCours() refuse si la demande n’est pas EN_ATTENTE', async () => {
    repository.findOne.mockResolvedValue({ id: 'd1', statut: DemandeStatut.TERMINEE });
    await expect(service.marquerEnCours('d1')).rejects.toThrow(ConflictException);
  });
});
