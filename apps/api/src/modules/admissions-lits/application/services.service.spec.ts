import { NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';

describe('ServicesService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let sitesService: { findById: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: ServicesService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'service-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    sitesService = { findById: jest.fn().mockResolvedValue({ id: 'site-1', etablissementId: 'etab-1' }) };
    auditService = { log: jest.fn() };

    service = new ServicesService(tenantContext as any, sitesService as any, auditService as any);
  });

  it('crée un service rattaché au tenant courant et journalise', async () => {
    const created = await service.create({ siteId: 'site-1', nom: 'Urgences', code: 'URG' }, 'user-1');

    expect(created.etablissementId).toBe('etab-1');
    expect(created.siteId).toBe('site-1');
    expect(sitesService.findById).toHaveBeenCalledWith('site-1');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'service.create', etablissementId: 'etab-1', userId: 'user-1' }),
    );
  });

  it('create() propage le NotFoundException si le site est introuvable (RLS-scopé)', async () => {
    sitesService.findById.mockRejectedValue(new NotFoundException('Site introuvable.'));

    await expect(service.create({ siteId: 'site-autre-tenant', nom: 'Urgences', code: 'URG' }, 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('findById lève NotFoundException si le service est introuvable', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findById('inconnu')).rejects.toThrow(NotFoundException);
  });

  it('update fusionne les champs et journalise', async () => {
    repository.findOne.mockResolvedValue({ id: 'service-1', etablissementId: 'etab-1', nom: 'Urgences' });

    const updated = await service.update('service-1', { nom: 'Urgences adultes' }, 'user-1');

    expect(updated.nom).toBe('Urgences adultes');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'service.update' }));
  });
});
