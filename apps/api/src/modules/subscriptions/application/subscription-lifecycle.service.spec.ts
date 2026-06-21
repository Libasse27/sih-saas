import { EtablissementStatut, SubscriptionStatut } from '@sih-saas/shared';
import { SubscriptionEntity } from '../infrastructure/entities/subscription.entity';
import {
  PERIODE_AVANT_SUSPENSION_JOURS,
  PERIODE_GRACE_JOURS,
  SubscriptionLifecycleService,
} from './subscription-lifecycle.service';

describe('SubscriptionLifecycleService', () => {
  let repository: { find: jest.Mock; save: jest.Mock };
  let etablissementsService: { updateStatut: jest.Mock; findById: jest.Mock };
  let auditService: { log: jest.Mock };
  let usersService: { findById: jest.Mock };
  let mailService: { envoyerRelanceAbonnement: jest.Mock };
  let service: SubscriptionLifecycleService;

  const maintenant = new Date('2026-06-18T00:00:00Z');

  const buildSubscription = (overrides: Partial<SubscriptionEntity>): SubscriptionEntity =>
    ({
      id: 'sub-1',
      etablissementId: 'etab-1',
      historique: [],
      ...overrides,
    }) as SubscriptionEntity;

  beforeEach(() => {
    repository = { find: jest.fn(), save: jest.fn((entity) => entity) };
    etablissementsService = {
      updateStatut: jest.fn(),
      findById: jest.fn().mockResolvedValue({ adminId: 'admin-1', nom: 'Clinique Test' }),
    };
    auditService = { log: jest.fn() };
    usersService = { findById: jest.fn().mockResolvedValue({ email: 'admin@clinique-test.sn' }) };
    mailService = { envoyerRelanceAbonnement: jest.fn().mockResolvedValue(undefined) };
    service = new SubscriptionLifecycleService(
      repository as any,
      etablissementsService as any,
      auditService as any,
      usersService as any,
      mailService as any,
    );
  });

  it('fait passer un essai expiré directement en EXPIRE', async () => {
    const essaiExpire = buildSubscription({
      statut: SubscriptionStatut.ESSAI,
      dateFin: new Date('2026-06-01T00:00:00Z'),
    });
    repository.find.mockImplementation(({ where }: any) =>
      where.statut === SubscriptionStatut.ESSAI ? [essaiExpire] : [],
    );

    await service.transitionerAbonnementsExpires(maintenant);

    expect(essaiExpire.statut).toBe(SubscriptionStatut.EXPIRE);
    expect(etablissementsService.updateStatut).toHaveBeenCalledWith('etab-1', EtablissementStatut.EXPIRE, null);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'subscription.auto_transition', etablissementId: 'etab-1' }),
    );
  });

  it('fait passer un abonnement ACTIF expiré en période de grâce (sans changer le statut établissement)', async () => {
    const actifExpire = buildSubscription({
      statut: SubscriptionStatut.ACTIF,
      dateFin: new Date('2026-06-01T00:00:00Z'),
    });
    repository.find.mockImplementation(({ where }: any) =>
      where.statut === SubscriptionStatut.ACTIF ? [actifExpire] : [],
    );

    await service.transitionerAbonnementsExpires(maintenant);

    expect(actifExpire.statut).toBe(SubscriptionStatut.EN_PERIODE_GRACE);
    expect(etablissementsService.updateStatut).not.toHaveBeenCalled();
  });

  it('fait passer en EXPIRE un abonnement dont la période de grâce est écoulée', async () => {
    const dateFin = new Date(maintenant);
    dateFin.setDate(dateFin.getDate() - (PERIODE_GRACE_JOURS + 1));
    const enGraceEcoulee = buildSubscription({ statut: SubscriptionStatut.EN_PERIODE_GRACE, dateFin });
    repository.find.mockImplementation(({ where }: any) =>
      where.statut === SubscriptionStatut.EN_PERIODE_GRACE ? [enGraceEcoulee] : [],
    );

    await service.transitionerAbonnementsExpires(maintenant);

    expect(enGraceEcoulee.statut).toBe(SubscriptionStatut.EXPIRE);
    expect(etablissementsService.updateStatut).toHaveBeenCalledWith('etab-1', EtablissementStatut.EXPIRE, null);
  });

  it('laisse en période de grâce un abonnement dont le délai n’est pas encore écoulé', async () => {
    const dateFin = new Date(maintenant);
    dateFin.setDate(dateFin.getDate() - (PERIODE_GRACE_JOURS - 1));
    const enGrace = buildSubscription({ statut: SubscriptionStatut.EN_PERIODE_GRACE, dateFin });
    repository.find.mockImplementation(({ where }: any) =>
      where.statut === SubscriptionStatut.EN_PERIODE_GRACE ? [enGrace] : [],
    );

    await service.transitionerAbonnementsExpires(maintenant);

    expect(enGrace.statut).toBe(SubscriptionStatut.EN_PERIODE_GRACE);
    expect(etablissementsService.updateStatut).not.toHaveBeenCalled();
  });

  it('envoie une relance (dunning) à l’admin lors de chaque transition', async () => {
    const essaiExpire = buildSubscription({ statut: SubscriptionStatut.ESSAI, dateFin: new Date('2026-06-01T00:00:00Z') });
    repository.find.mockImplementation(({ where }: any) =>
      where.statut === SubscriptionStatut.ESSAI ? [essaiExpire] : [],
    );

    await service.transitionerAbonnementsExpires(maintenant);

    expect(usersService.findById).toHaveBeenCalledWith('admin-1');
    expect(mailService.envoyerRelanceAbonnement).toHaveBeenCalledWith(
      'admin@clinique-test.sn',
      'Clinique Test',
      SubscriptionStatut.EXPIRE,
    );
  });

  it('n’interrompt pas la transition si l’envoi de la relance échoue', async () => {
    mailService.envoyerRelanceAbonnement.mockRejectedValue(new Error('SMTP indisponible'));
    const essaiExpire = buildSubscription({ statut: SubscriptionStatut.ESSAI, dateFin: new Date('2026-06-01T00:00:00Z') });
    repository.find.mockImplementation(({ where }: any) =>
      where.statut === SubscriptionStatut.ESSAI ? [essaiExpire] : [],
    );

    await expect(service.transitionerAbonnementsExpires(maintenant)).resolves.toBeUndefined();
    expect(essaiExpire.statut).toBe(SubscriptionStatut.EXPIRE);
  });

  it('suspend un abonnement EXPIRE depuis plus longtemps que le délai de suspension', async () => {
    const dateTransition = new Date(maintenant);
    dateTransition.setDate(dateTransition.getDate() - (PERIODE_AVANT_SUSPENSION_JOURS + 1));
    const expireDepuisLongtemps = buildSubscription({
      statut: SubscriptionStatut.EXPIRE,
      dateFin: dateTransition,
      historique: [{ date: dateTransition.toISOString(), action: 'subscription.auto_transition' }],
    });
    repository.find.mockImplementation(({ where }: any) =>
      where.statut === SubscriptionStatut.EXPIRE ? [expireDepuisLongtemps] : [],
    );

    await service.transitionerAbonnementsExpires(maintenant);

    expect(expireDepuisLongtemps.statut).toBe(SubscriptionStatut.SUSPENDU);
    expect(etablissementsService.updateStatut).toHaveBeenCalledWith('etab-1', EtablissementStatut.SUSPENDU, null);
    expect(mailService.envoyerRelanceAbonnement).toHaveBeenCalledWith(
      'admin@clinique-test.sn',
      'Clinique Test',
      SubscriptionStatut.SUSPENDU,
    );
  });

  it('ne suspend pas un abonnement EXPIRE depuis moins longtemps que le délai de suspension', async () => {
    const dateTransition = new Date(maintenant);
    dateTransition.setDate(dateTransition.getDate() - (PERIODE_AVANT_SUSPENSION_JOURS - 1));
    const expireRecemment = buildSubscription({
      statut: SubscriptionStatut.EXPIRE,
      dateFin: dateTransition,
      historique: [{ date: dateTransition.toISOString(), action: 'subscription.auto_transition' }],
    });
    repository.find.mockImplementation(({ where }: any) =>
      where.statut === SubscriptionStatut.EXPIRE ? [expireRecemment] : [],
    );

    await service.transitionerAbonnementsExpires(maintenant);

    expect(expireRecemment.statut).toBe(SubscriptionStatut.EXPIRE);
    expect(etablissementsService.updateStatut).not.toHaveBeenCalled();
  });
});
