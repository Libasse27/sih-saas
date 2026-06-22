import { Periodicite } from '@sih-saas/shared';
import { ProvisioningService } from './provisioning.service';

describe('ProvisioningService', () => {
  let subscriptionsService: { subscribe: jest.Mock };
  let etablissementsService: { findById: jest.Mock };
  let usersService: { findById: jest.Mock };
  let mailService: { envoyerBienvenue: jest.Mock };
  let auditService: { log: jest.Mock };
  let servicesService: { create: jest.Mock };
  let sitesService: { create: jest.Mock };
  let tenantContext: { runForEtablissement: jest.Mock };
  let service: ProvisioningService;

  beforeEach(() => {
    subscriptionsService = { subscribe: jest.fn().mockResolvedValue({ id: 'sub-1' }) };
    etablissementsService = {
      findById: jest.fn().mockResolvedValue({ id: 'etab-1', nom: 'Clinique Test', adminId: 'admin-1' }),
    };
    usersService = { findById: jest.fn().mockResolvedValue({ id: 'admin-1', email: 'admin@clinique.sn' }) };
    mailService = { envoyerBienvenue: jest.fn() };
    auditService = { log: jest.fn() };
    servicesService = { create: jest.fn().mockResolvedValue({ id: 'service-1' }) };
    sitesService = { create: jest.fn().mockResolvedValue({ id: 'site-1' }) };
    tenantContext = { runForEtablissement: jest.fn((_id: string, callback: () => Promise<unknown>) => callback()) };

    service = new ProvisioningService(
      subscriptionsService as any,
      etablissementsService as any,
      usersService as any,
      mailService as any,
      auditService as any,
      servicesService as any,
      sitesService as any,
      tenantContext as any,
    );
  });

  it('souscrit le plan, envoie l’email de bienvenue et journalise le provisionnement', async () => {
    const subscription = await service.provisionner('etab-1', 'plan-1', Periodicite.MENSUEL);

    expect(subscriptionsService.subscribe).toHaveBeenCalledWith(
      'etab-1',
      { planId: 'plan-1', periodicite: Periodicite.MENSUEL },
      'admin-1',
    );
    expect(mailService.envoyerBienvenue).toHaveBeenCalledWith('admin@clinique.sn', 'Clinique Test');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'etablissement.provisionne', etablissementId: 'etab-1' }),
    );
    expect(subscription.id).toBe('sub-1');
    expect(tenantContext.runForEtablissement).toHaveBeenCalledWith('etab-1', expect.any(Function));
    expect(sitesService.create).toHaveBeenCalledWith({ nom: 'Site principal', code: 'PRINCIPAL' }, 'admin-1');
    expect(servicesService.create).toHaveBeenCalledTimes(3);
    expect(servicesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CONSULT', siteId: 'site-1' }),
      'admin-1',
    );
    expect(servicesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'HOSPIT', siteId: 'site-1' }),
      'admin-1',
    );
    expect(servicesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'URGENCES', siteId: 'site-1' }),
      'admin-1',
    );
  });

  it("n'échoue pas si l'envoi de l'email de bienvenue échoue", async () => {
    mailService.envoyerBienvenue.mockRejectedValue(new Error('SMTP indisponible'));

    await expect(service.provisionner('etab-1', 'plan-1', Periodicite.ANNUEL)).resolves.toBeDefined();
    expect(auditService.log).toHaveBeenCalled();
  });

  it("n'échoue pas si la création des services par défaut échoue", async () => {
    tenantContext.runForEtablissement.mockRejectedValue(new Error('RLS indisponible'));

    await expect(service.provisionner('etab-1', 'plan-1', Periodicite.MENSUEL)).resolves.toBeDefined();
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'etablissement.provisionne' }));
  });

  it('transmet couponApplique/montantOverride à subscribe() quand fournis', async () => {
    await service.provisionner('etab-1', 'plan-1', Periodicite.MENSUEL, {
      couponApplique: 'PROMO20',
      montantOverride: 40000,
    });

    expect(subscriptionsService.subscribe).toHaveBeenCalledWith(
      'etab-1',
      { planId: 'plan-1', periodicite: Periodicite.MENSUEL, couponApplique: 'PROMO20', montantOverride: 40000 },
      'admin-1',
    );
  });

  it("ignore l'envoi d'email si l'établissement n'a pas encore d'admin assigné", async () => {
    etablissementsService.findById.mockResolvedValue({ id: 'etab-1', nom: 'Clinique Test', adminId: null });

    await service.provisionner('etab-1', 'plan-1', Periodicite.MENSUEL);

    expect(mailService.envoyerBienvenue).not.toHaveBeenCalled();
    expect(subscriptionsService.subscribe).toHaveBeenCalledWith(
      'etab-1',
      { planId: 'plan-1', periodicite: Periodicite.MENSUEL },
      'etab-1',
    );
  });
});
