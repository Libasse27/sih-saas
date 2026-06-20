import { Periodicite } from '@sih-saas/shared';
import { ProvisioningService } from './provisioning.service';

describe('ProvisioningService', () => {
  let subscriptionsService: { subscribe: jest.Mock };
  let etablissementsService: { findById: jest.Mock };
  let usersService: { findById: jest.Mock };
  let mailService: { envoyerBienvenue: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: ProvisioningService;

  beforeEach(() => {
    subscriptionsService = { subscribe: jest.fn().mockResolvedValue({ id: 'sub-1' }) };
    etablissementsService = {
      findById: jest.fn().mockResolvedValue({ id: 'etab-1', nom: 'Clinique Test', adminId: 'admin-1' }),
    };
    usersService = { findById: jest.fn().mockResolvedValue({ id: 'admin-1', email: 'admin@clinique.sn' }) };
    mailService = { envoyerBienvenue: jest.fn() };
    auditService = { log: jest.fn() };

    service = new ProvisioningService(
      subscriptionsService as any,
      etablissementsService as any,
      usersService as any,
      mailService as any,
      auditService as any,
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
  });

  it("n'échoue pas si l'envoi de l'email de bienvenue échoue", async () => {
    mailService.envoyerBienvenue.mockRejectedValue(new Error('SMTP indisponible'));

    await expect(service.provisionner('etab-1', 'plan-1', Periodicite.ANNUEL)).resolves.toBeDefined();
    expect(auditService.log).toHaveBeenCalled();
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
