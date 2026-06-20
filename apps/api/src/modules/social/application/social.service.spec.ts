import { NotFoundException } from '@nestjs/common';
import { SocialService } from './social.service';

describe('SocialService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let patientsService: { findById: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: SocialService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'note-1', ...entity })),
      find: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    patientsService = { findById: jest.fn().mockResolvedValue({ id: 'patient-1', etablissementId: 'etab-1' }) };
    auditService = { log: jest.fn() };

    service = new SocialService(tenantContext as any, patientsService as any, auditService as any);
  });

  it('crée une note rattachée au patient, au tenant courant et à l’auteur, journalise', async () => {
    const note = await service.create('patient-1', { contenu: 'Premier entretien social.' }, 'assistant-1');

    expect(note.etablissementId).toBe('etab-1');
    expect(note.patientId).toBe('patient-1');
    expect(note.auteurId).toBe('assistant-1');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'social.note.create' }));
  });

  it("rejette si le patient est introuvable dans le tenant courant (RLS via PatientsService.findById)", async () => {
    patientsService.findById.mockRejectedValue(new NotFoundException('Patient introuvable.'));

    await expect(service.create('patient-autre-tenant', { contenu: 'X' }, 'assistant-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('findAllForPatient liste les notes du patient triées par date décroissante', async () => {
    repository.find.mockResolvedValue([{ id: 'note-1' }]);

    const notes = await service.findAllForPatient('patient-1');

    expect(repository.find).toHaveBeenCalledWith({ where: { patientId: 'patient-1' }, order: { createdAt: 'DESC' } });
    expect(notes).toHaveLength(1);
  });
});
