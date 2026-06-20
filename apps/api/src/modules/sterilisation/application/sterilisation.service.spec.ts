import { NotFoundException } from '@nestjs/common';
import { CycleSterilisationStatut } from '@sih-saas/shared';
import { SterilisationService } from './sterilisation.service';

describe('SterilisationService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: SterilisationService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'cycle-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    auditService = { log: jest.fn() };

    service = new SterilisationService(tenantContext as any, auditService as any);
  });

  it('crée un cycle rattaché au tenant courant et à l’agent, journalise', async () => {
    const cycle = await service.create({ materiel: 'Plateau chirurgical A', numeroLot: 'LOT-2026-001' }, 'agent-1');

    expect(cycle.etablissementId).toBe('etab-1');
    expect(cycle.agentId).toBe('agent-1');
    expect(cycle.dateDebut).toBeInstanceOf(Date);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'sterilisation.cycle.create' }),
    );
  });

  it('findById lève NotFoundException si le cycle est introuvable', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findById('inconnu')).rejects.toThrow(NotFoundException);
  });

  it('renseigne dateFin quand le statut passe à TERMINE', async () => {
    repository.findOne.mockResolvedValue({
      id: 'cycle-1',
      etablissementId: 'etab-1',
      statut: CycleSterilisationStatut.EN_COURS,
      dateFin: null,
    });

    const updated = await service.update('cycle-1', { statut: CycleSterilisationStatut.TERMINE }, 'agent-1');

    expect(updated.statut).toBe(CycleSterilisationStatut.TERMINE);
    expect(updated.dateFin).toBeInstanceOf(Date);
  });
});
