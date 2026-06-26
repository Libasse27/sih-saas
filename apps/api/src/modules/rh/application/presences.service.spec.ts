import { PresenceStatut } from '@sih-saas/shared';
import { QueryFailedError } from 'typeorm';
import { PresencesService } from './presences.service';

describe('PresencesService', () => {
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    find: jest.Mock;
  };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let employesService: { findById: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: PresencesService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'presence-1', ...entity })),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    employesService = { findById: jest.fn().mockResolvedValue({ id: 'employe-1', etablissementId: 'etab-1' }) };
    auditService = { log: jest.fn() };

    service = new PresencesService(tenantContext as any, employesService as any, auditService as any);
  });

  it('crée un nouveau pointage quand aucune ligne n’existe pour ce jour, journalise rh.presence.create', async () => {
    repository.findOne.mockResolvedValue(null);

    const presence = await service.create(
      'employe-1',
      { date: '2026-06-23', heureArrivee: '08:00', statut: PresenceStatut.PRESENT },
      'rh-1',
    );

    expect(presence.etablissementId).toBe('etab-1');
    expect(presence.employeId).toBe('employe-1');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'rh.presence.create' }));
  });

  it('met à jour la ligne existante au lieu de violer l’unicité (etablissementId, employeId, date), journalise rh.presence.update', async () => {
    repository.findOne.mockResolvedValue({
      id: 'presence-1',
      etablissementId: 'etab-1',
      employeId: 'employe-1',
      date: '2026-06-23',
      statut: PresenceStatut.RETARD,
    });

    const presence = await service.create(
      'employe-1',
      { date: '2026-06-23', heureArrivee: '09:15', statut: PresenceStatut.RETARD, commentaire: 'Bus en retard' },
      'rh-1',
    );

    expect(presence.statut).toBe(PresenceStatut.RETARD);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'rh.presence.update' }));
  });

  it('rejoue l’upsert sur une violation de contrainte unique concurrente (23505) au lieu de laisser remonter une 500', async () => {
    repository.findOne.mockResolvedValue(null);
    const conflictError = Object.assign(new QueryFailedError('INSERT', [], new Error('duplicate key')), {
      code: '23505',
    });
    repository.save.mockRejectedValueOnce(conflictError);
    repository.findOneBy.mockResolvedValue({
      id: 'presence-concurrente',
      etablissementId: 'etab-1',
      employeId: 'employe-1',
      date: '2026-06-23',
      statut: PresenceStatut.PRESENT,
    });
    repository.save.mockResolvedValueOnce({ id: 'presence-concurrente', statut: PresenceStatut.PRESENT });

    const presence = await service.create(
      'employe-1',
      { date: '2026-06-23', statut: PresenceStatut.PRESENT },
      'rh-1',
    );

    expect(presence.id).toBe('presence-concurrente');
    expect(repository.findOneBy).toHaveBeenCalledWith({ employeId: 'employe-1', date: '2026-06-23' });
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'rh.presence.update' }));
  });

  it('findAllForEmploye filtre par jour précis quand ?date= est fourni', async () => {
    repository.find.mockResolvedValue([]);

    await service.findAllForEmploye('employe-1', { date: '2026-06-23' });

    expect(repository.find).toHaveBeenCalledWith({
      where: { employeId: 'employe-1', date: '2026-06-23' },
      order: { date: 'DESC' },
    });
  });
});
