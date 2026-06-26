import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalleOperationStatut } from '@sih-saas/shared';
import { SallesOperationService } from './salles-operation.service';

describe('SallesOperationService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: SallesOperationService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'salle-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    auditService = { log: jest.fn() };

    service = new SallesOperationService(tenantContext as any, auditService as any);
  });

  describe('create', () => {
    it('crée une salle LIBRE rattachée au tenant courant et journalise', async () => {
      const salle = await service.create({ nom: 'Salle 1', equipement: 'Bistouri électrique' }, 'user-1');

      expect(salle.etablissementId).toBe('etab-1');
      expect(salle.statut).toBe(SalleOperationStatut.LIBRE);
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'salle-operation.create' }));
    });
  });

  describe('findById', () => {
    it('lève NotFoundException si la salle est introuvable', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('inconnue')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('refuse de fixer manuellement le statut à OCCUPEE', async () => {
      await expect(service.update('salle-1', { statut: SalleOperationStatut.OCCUPEE }, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('autorise le passage manuel à MAINTENANCE', async () => {
      repository.findOne.mockResolvedValue({ id: 'salle-1', etablissementId: 'etab-1', statut: SalleOperationStatut.LIBRE });

      const salle = await service.update('salle-1', { statut: SalleOperationStatut.MAINTENANCE }, 'user-1');

      expect(salle.statut).toBe(SalleOperationStatut.MAINTENANCE);
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'salle-operation.update' }));
    });
  });

  describe('changerStatutOccupation', () => {
    it('bascule le statut sans passer par la garde de update (réservé à InterventionsService)', async () => {
      repository.findOne.mockResolvedValue({ id: 'salle-1', etablissementId: 'etab-1', statut: SalleOperationStatut.LIBRE });

      const salle = await service.changerStatutOccupation('salle-1', SalleOperationStatut.OCCUPEE);

      expect(salle.statut).toBe(SalleOperationStatut.OCCUPEE);
    });
  });
});
