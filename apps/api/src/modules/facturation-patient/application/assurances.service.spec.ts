import { AssurancesService } from './assurances.service';

describe('AssurancesService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; find: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: AssurancesService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'assurance-1', ...entity })),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    auditService = { log: jest.fn() };

    service = new AssurancesService(tenantContext as any, auditService as any);
  });

  it('crée une assurance rattachée au patient et journalise', async () => {
    const assurance = await service.create(
      'patient-1',
      { organisme: 'IPM' as never, numeroPolice: 'POL-123', tauxCouverture: 80, valideDu: '2026-01-01', valideAu: '2026-12-31' },
      'caissier-1',
    );

    expect(assurance.patientId).toBe('patient-1');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'assurance.create' }));
  });

  it('findActivePourPatient() interroge avec les bornes de validité', async () => {
    repository.findOne.mockResolvedValue({ id: 'assurance-1', tauxCouverture: 80 });

    const assurance = await service.findActivePourPatient('patient-1');

    expect(repository.findOne).toHaveBeenCalled();
    expect(assurance?.tauxCouverture).toBe(80);
  });
});
