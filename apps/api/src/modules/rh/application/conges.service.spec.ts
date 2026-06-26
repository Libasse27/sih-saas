import { ConflictException, NotFoundException } from '@nestjs/common';
import { CongeStatut, CongeType } from '@sih-saas/shared';
import { CongesService } from './conges.service';

describe('CongesService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; find: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let employesService: { findById: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: CongesService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'conge-1', ...entity })),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    employesService = { findById: jest.fn().mockResolvedValue({ id: 'employe-1', etablissementId: 'etab-1' }) };
    auditService = { log: jest.fn() };

    service = new CongesService(tenantContext as any, employesService as any, auditService as any);
  });

  it('crée une demande de congé rattachée à l’employé et au tenant courant, journalise', async () => {
    const conge = await service.create(
      'employe-1',
      { type: CongeType.CONGE_PAYE, dateDebut: '2026-07-01', dateFin: '2026-07-10', nombreJours: 10 },
      'rh-1',
    );

    expect(conge.etablissementId).toBe('etab-1');
    expect(conge.employeId).toBe('employe-1');
    expect(employesService.findById).toHaveBeenCalledWith('employe-1');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'rh.conge.create' }));
  });

  it('rejette la création si l’employé est introuvable dans le tenant courant', async () => {
    employesService.findById.mockRejectedValue(new NotFoundException('Employé introuvable.'));

    await expect(
      service.create('employe-autre-tenant', { type: CongeType.MALADIE, dateDebut: '2026-07-01', dateFin: '2026-07-02', nombreJours: 2 }, 'rh-1'),
    ).rejects.toThrow(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('valider passe une demande DEMANDE à APPROUVE et renseigne valideParUserId/dateValidation', async () => {
    repository.findOne.mockResolvedValue({
      id: 'conge-1',
      etablissementId: 'etab-1',
      statut: CongeStatut.DEMANDE,
      valideParUserId: null,
      dateValidation: null,
    });

    const conge = await service.valider('conge-1', 'rh-1');

    expect(conge.statut).toBe(CongeStatut.APPROUVE);
    expect(conge.valideParUserId).toBe('rh-1');
    expect(conge.dateValidation).toBeInstanceOf(Date);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'rh.conge.valider' }));
  });

  it('rejeter passe une demande DEMANDE à REJETE et renseigne valideParUserId/dateValidation', async () => {
    repository.findOne.mockResolvedValue({
      id: 'conge-1',
      etablissementId: 'etab-1',
      statut: CongeStatut.DEMANDE,
      valideParUserId: null,
      dateValidation: null,
    });

    const conge = await service.rejeter('conge-1', 'rh-1');

    expect(conge.statut).toBe(CongeStatut.REJETE);
    expect(conge.valideParUserId).toBe('rh-1');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'rh.conge.rejeter' }));
  });

  it('refuse de valider une demande déjà tranchée (ConflictException)', async () => {
    repository.findOne.mockResolvedValue({ id: 'conge-1', etablissementId: 'etab-1', statut: CongeStatut.APPROUVE });

    await expect(service.valider('conge-1', 'rh-1')).rejects.toThrow(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('refuse de rejeter une demande déjà annulée (ConflictException)', async () => {
    repository.findOne.mockResolvedValue({ id: 'conge-1', etablissementId: 'etab-1', statut: CongeStatut.ANNULE });

    await expect(service.rejeter('conge-1', 'rh-1')).rejects.toThrow(ConflictException);
  });

  it('findById lève NotFoundException si la demande est introuvable', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findById('inconnu')).rejects.toThrow(NotFoundException);
  });
});
