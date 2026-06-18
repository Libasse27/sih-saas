import { ConflictException } from '@nestjs/common';
import { DemandeStatut } from '@sih-saas/shared';
import { DemandesAnalyseService } from './demandes-analyse.service';

describe('DemandesAnalyseService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: DemandesAnalyseService;

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

    service = new DemandesAnalyseService(tenantContext as any, auditService as any);
  });

  it('crée la demande EN_ATTENTE et journalise', async () => {
    const demande = await service.create('patient-1', { typeAnalyse: 'NFS' }, 'medecin-1');

    expect(demande.statut).toBe(DemandeStatut.EN_ATTENTE);
    expect(demande.urgence).toBe(false);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'labo.demande.create' }));
  });

  it('marquerEnCours() refuse si la demande n’est pas EN_ATTENTE', async () => {
    repository.findOne.mockResolvedValue({ id: 'd1', statut: DemandeStatut.TERMINEE });
    await expect(service.marquerEnCours('d1')).rejects.toThrow(ConflictException);
  });

  it('marquerEnCours() passe EN_ATTENTE -> EN_COURS', async () => {
    repository.findOne.mockResolvedValue({ id: 'd1', statut: DemandeStatut.EN_ATTENTE });
    const saved = await service.marquerEnCours('d1');
    expect(saved.statut).toBe(DemandeStatut.EN_COURS);
  });

  it('marquerTerminee() passe au statut TERMINEE', async () => {
    repository.findOne.mockResolvedValue({ id: 'd1', statut: DemandeStatut.EN_COURS });
    const saved = await service.marquerTerminee('d1');
    expect(saved.statut).toBe(DemandeStatut.TERMINEE);
  });
});
