import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SitesService } from './sites.service';

describe('SitesService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock; count: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let subscriptionsService: { assertMultiSitesAutorise: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: SitesService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'site-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    subscriptionsService = { assertMultiSitesAutorise: jest.fn().mockResolvedValue(undefined) };
    auditService = { log: jest.fn() };

    service = new SitesService(tenantContext as any, subscriptionsService as any, auditService as any);
  });

  it('crée un site rattaché au tenant courant après avoir vérifié le forfait', async () => {
    const created = await service.create({ nom: 'Site principal', code: 'PRINCIPAL' }, 'user-1');

    expect(repository.count).toHaveBeenCalled();
    expect(subscriptionsService.assertMultiSitesAutorise).toHaveBeenCalledWith('etab-1', 0);
    expect(created.etablissementId).toBe('etab-1');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'site.create', etablissementId: 'etab-1', userId: 'user-1' }),
    );
  });

  it('create() propage le ForbiddenException quand le forfait ne permet pas un 2e site', async () => {
    repository.count.mockResolvedValue(1);
    subscriptionsService.assertMultiSitesAutorise.mockRejectedValue(
      new ForbiddenException("Votre forfait ne permet qu'un seul site. Passez à un forfait supérieur pour activer le multi-sites."),
    );

    await expect(service.create({ nom: 'Annexe', code: 'ANNEXE' }, 'user-1')).rejects.toThrow(ForbiddenException);
  });

  it('findById lève NotFoundException si le site est introuvable', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findById('inconnu')).rejects.toThrow(NotFoundException);
  });

  it('update fusionne les champs et journalise', async () => {
    repository.findOne.mockResolvedValue({ id: 'site-1', etablissementId: 'etab-1', nom: 'Site principal' });

    const updated = await service.update('site-1', { ville: 'Dakar' }, 'user-1');

    expect(updated.ville).toBe('Dakar');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'site.update' }));
  });
});
