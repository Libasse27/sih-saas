import { NotFoundException } from '@nestjs/common';
import { ChambresService } from './chambres.service';

describe('ChambresService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let servicesService: { findById: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: ChambresService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'chambre-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    servicesService = {
      findById: jest.fn().mockResolvedValue({ id: 'service-1', etablissementId: 'etab-1', siteId: 'site-1' }),
    };
    auditService = { log: jest.fn() };

    service = new ChambresService(tenantContext as any, servicesService as any, auditService as any);
  });

  it('crée une chambre et dénormalise siteId depuis le service (Phase 34)', async () => {
    const created = await service.create({ serviceId: 'service-1', numero: '101' }, 'user-1');

    expect(servicesService.findById).toHaveBeenCalledWith('service-1');
    expect(created.etablissementId).toBe('etab-1');
    expect(created.siteId).toBe('site-1');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'chambre.create', etablissementId: 'etab-1', userId: 'user-1' }),
    );
  });

  it('create() rejette un serviceId introuvable/cross-tenant (validation absente avant la Phase 34)', async () => {
    servicesService.findById.mockRejectedValue(new NotFoundException('Service introuvable.'));

    await expect(service.create({ serviceId: 'service-autre-tenant', numero: '101' }, 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('findById lève NotFoundException si la chambre est introuvable', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findById('inconnu')).rejects.toThrow(NotFoundException);
  });
});
