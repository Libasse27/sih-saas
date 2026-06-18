import { AdministrationStatut } from '@sih-saas/shared';
import { AdministrationService } from './administration.service';

describe('AdministrationService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: AdministrationService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'administration-1', ...entity })),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    auditService = { log: jest.fn() };

    service = new AdministrationService(tenantContext as any, auditService as any);
  });

  it('crée une administration et journalise', async () => {
    const administration = await service.create(
      'patient-1',
      { prescriptionLigneId: 'ligne-1', statut: AdministrationStatut.ADMINISTRE },
      'infirmier-1',
    );

    expect(administration.patientId).toBe('patient-1');
    expect(administration.statut).toBe(AdministrationStatut.ADMINISTRE);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'administration.create' }));
  });
});
