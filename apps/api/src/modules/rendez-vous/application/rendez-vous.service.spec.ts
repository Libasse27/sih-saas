import { BadRequestException } from '@nestjs/common';
import { RendezVousStatut } from '@sih-saas/shared';
import { RendezVousService } from './rendez-vous.service';

describe('RendezVousService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock; count: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let auditService: { log: jest.Mock };
  let usersService: { estPraticienValide: jest.Mock };
  let service: RendezVousService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'rdv-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      count: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    auditService = { log: jest.fn() };
    usersService = { estPraticienValide: jest.fn().mockResolvedValue(true) };

    service = new RendezVousService(tenantContext as any, auditService as any, usersService as any);
  });

  it('create() fixe le statut PLANIFIE et journalise', async () => {
    const rdv = await service.create(
      { patientId: 'patient-1', praticienId: 'medecin-1', dateHeure: '2026-06-22T09:30:00.000Z' },
      'medecin-1',
    );

    expect(rdv.statut).toBe(RendezVousStatut.PLANIFIE);
    expect(rdv.etablissementId).toBe('etab-1');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'rdv.create' }));
  });

  it('createForPatient() utilise le patientId fourni par le contrôleur, jamais celui du body', async () => {
    const rdv = await service.createForPatient(
      'patient-self',
      { praticienId: 'medecin-1', dateHeure: '2026-06-22T09:30:00.000Z' },
      'patient-self',
    );

    expect(rdv.patientId).toBe('patient-self');
    expect(usersService.estPraticienValide).toHaveBeenCalledWith('medecin-1', 'etab-1');
  });

  it('createForPatient() refuse un praticien inexistant ou non soignant', async () => {
    usersService.estPraticienValide.mockResolvedValue(false);

    await expect(
      service.createForPatient(
        'patient-self',
        { praticienId: 'inconnu', dateHeure: '2026-06-22T09:30:00.000Z' },
        'patient-self',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('existeRdvEntrePraticienEtPatient() renvoie true si au moins un RDV existe', async () => {
    repository.count.mockResolvedValue(1);

    await expect(service.existeRdvEntrePraticienEtPatient('medecin-1', 'patient-1')).resolves.toBe(true);
    expect(repository.count).toHaveBeenCalledWith({ where: { praticienId: 'medecin-1', patientId: 'patient-1' } });
  });

  it('changerStatut() met à jour le statut et journalise', async () => {
    repository.findOne.mockResolvedValue({ id: 'rdv-1', etablissementId: 'etab-1', statut: RendezVousStatut.PLANIFIE });

    const rdv = await service.changerStatut('rdv-1', RendezVousStatut.CONFIRME, 'user-1');

    expect(rdv.statut).toBe(RendezVousStatut.CONFIRME);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'rdv.statut.update' }));
  });
});
