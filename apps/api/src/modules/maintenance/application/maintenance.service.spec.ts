import { NotFoundException } from '@nestjs/common';
import { DemandeMaintenanceStatut } from '@sih-saas/shared';
import { MaintenanceService } from './maintenance.service';

describe('MaintenanceService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: MaintenanceService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'demande-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    auditService = { log: jest.fn() };

    service = new MaintenanceService(tenantContext as any, auditService as any);
  });

  it('crée une demande rattachée au tenant courant et au demandeur, journalise', async () => {
    const demande = await service.create({ equipement: 'Climatiseur bloc B', description: 'Ne refroidit plus' }, 'user-1');

    expect(demande.etablissementId).toBe('etab-1');
    expect(demande.demandeurId).toBe('user-1');
    expect(demande.dateSignalement).toBeInstanceOf(Date);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'maintenance.demande.create', etablissementId: 'etab-1' }),
    );
  });

  it('findById lève NotFoundException si la demande est introuvable', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findById('inconnue')).rejects.toThrow(NotFoundException);
  });

  it('renseigne automatiquement dateResolution quand le statut passe à RESOLUE', async () => {
    repository.findOne.mockResolvedValue({
      id: 'demande-1',
      etablissementId: 'etab-1',
      statut: DemandeMaintenanceStatut.EN_COURS,
      dateResolution: null,
    });

    const updated = await service.update('demande-1', { statut: DemandeMaintenanceStatut.RESOLUE }, 'technicien-1');

    expect(updated.statut).toBe(DemandeMaintenanceStatut.RESOLUE);
    expect(updated.dateResolution).toBeInstanceOf(Date);
  });
});
