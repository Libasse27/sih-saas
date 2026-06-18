import { BadRequestException } from '@nestjs/common';
import { RendezVousStatut } from '@sih-saas/shared';
import { ConsultationsService } from './consultations.service';

describe('ConsultationsService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let rendezVousService: { findById: jest.Mock; changerStatut: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: ConsultationsService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'consultation-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    rendezVousService = {
      findById: jest.fn().mockResolvedValue({ id: 'rdv-1', patientId: 'patient-1' }),
      changerStatut: jest.fn().mockResolvedValue(undefined),
    };
    auditService = { log: jest.fn() };

    service = new ConsultationsService(tenantContext as any, rendezVousService as any, auditService as any);
  });

  it('refuse si le rendez-vous indiqué ne concerne pas ce patient', async () => {
    rendezVousService.findById.mockResolvedValue({ id: 'rdv-1', patientId: 'AUTRE_PATIENT' });

    await expect(
      service.create('patient-1', { rendezVousId: 'rdv-1', motif: 'Suivi' }, 'medecin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('crée la consultation et passe le RDV lié à TERMINE', async () => {
    const consultation = await service.create('patient-1', { rendezVousId: 'rdv-1', motif: 'Suivi' }, 'medecin-1');

    expect(consultation.patientId).toBe('patient-1');
    expect(consultation.praticienId).toBe('medecin-1');
    expect(rendezVousService.changerStatut).toHaveBeenCalledWith('rdv-1', RendezVousStatut.TERMINE, 'medecin-1');
  });

  it('fonctionne sans rendez-vous (consultation ad-hoc)', async () => {
    await service.create('patient-1', { motif: 'Urgence' }, 'medecin-1');
    expect(rendezVousService.changerStatut).not.toHaveBeenCalled();
  });

  it('journalise la création', async () => {
    await service.create('patient-1', { motif: 'Suivi' }, 'medecin-1');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'consultation.create' }));
  });
});
