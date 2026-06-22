import { BadRequestException, ConflictException } from '@nestjs/common';
import { LitStatut } from '@sih-saas/shared';
import { LitsService } from './lits.service';

describe('LitsService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock; afterCommit: jest.Mock };
  let chambresService: { findById: jest.Mock };
  let subscriptionsService: { assertWithinLimit: jest.Mock };
  let etablissementsService: { incrementUsage: jest.Mock };
  let auditService: { log: jest.Mock };
  let realtimeGateway: { emitToEtablissement: jest.Mock };
  let service: LitsService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'lit-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
      afterCommit: jest.fn((cb) => cb()),
    };
    chambresService = {
      findById: jest.fn().mockResolvedValue({ id: 'chambre-1', serviceId: 'service-1', siteId: 'site-1' }),
    };
    subscriptionsService = { assertWithinLimit: jest.fn().mockResolvedValue(undefined) };
    etablissementsService = { incrementUsage: jest.fn().mockResolvedValue(undefined) };
    auditService = { log: jest.fn() };
    realtimeGateway = { emitToEtablissement: jest.fn() };

    service = new LitsService(
      tenantContext as any,
      chambresService as any,
      subscriptionsService as any,
      etablissementsService as any,
      auditService as any,
      realtimeGateway as any,
    );
  });

  it('create() vérifie la limite maxLits puis incrémente usage.lits', async () => {
    await service.create({ chambreId: 'chambre-1', numero: '101' }, 'user-1');

    expect(subscriptionsService.assertWithinLimit).toHaveBeenCalledWith('etab-1', 'maxLits');
    expect(etablissementsService.incrementUsage).toHaveBeenCalledWith('etab-1', 'lits', 1);
  });

  it('create() dénormalise le serviceId et le siteId depuis la chambre', async () => {
    const lit = await service.create({ chambreId: 'chambre-1', numero: '101' }, 'user-1');
    expect(lit.serviceId).toBe('service-1');
    expect(lit.siteId).toBe('site-1');
  });

  it('assigner() refuse un lit qui n’est pas LIBRE', async () => {
    repository.findOne.mockResolvedValue({ id: 'lit-1', statut: LitStatut.OCCUPE, etablissementId: 'etab-1' });

    await expect(service.assigner('lit-1', 'patient-1', 'user-1')).rejects.toThrow(ConflictException);
  });

  it('assigner() passe le lit à OCCUPE et émet lits:updated après commit', async () => {
    repository.findOne.mockResolvedValue({ id: 'lit-1', statut: LitStatut.LIBRE, etablissementId: 'etab-1' });

    const lit = await service.assigner('lit-1', 'patient-1', 'user-1');

    expect(lit.statut).toBe(LitStatut.OCCUPE);
    expect(lit.patientActuelId).toBe('patient-1');
    expect(tenantContext.afterCommit).toHaveBeenCalled();
    expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith(
      'etab-1',
      'lits:updated',
      expect.objectContaining({ id: 'lit-1', statut: LitStatut.OCCUPE, patientActuelId: 'patient-1' }),
    );
  });

  it('liberer() remet le lit à LIBRE et vide patientActuelId', async () => {
    repository.findOne.mockResolvedValue({
      id: 'lit-1',
      statut: LitStatut.OCCUPE,
      patientActuelId: 'patient-1',
      etablissementId: 'etab-1',
    });

    const lit = await service.liberer('lit-1', 'user-1');

    expect(lit.statut).toBe(LitStatut.LIBRE);
    expect(lit.patientActuelId).toBeNull();
    expect(realtimeGateway.emitToEtablissement).toHaveBeenCalled();
  });

  it('changerStatutStructurel() refuse de fixer OCCUPE directement', async () => {
    await expect(service.changerStatutStructurel('lit-1', LitStatut.OCCUPE, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
