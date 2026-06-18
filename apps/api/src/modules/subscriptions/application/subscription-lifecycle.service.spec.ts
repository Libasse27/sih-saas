import { EtablissementStatut, SubscriptionStatut } from '@sih-saas/shared';
import { SubscriptionEntity } from '../infrastructure/entities/subscription.entity';
import { PERIODE_GRACE_JOURS, SubscriptionLifecycleService } from './subscription-lifecycle.service';

describe('SubscriptionLifecycleService', () => {
  let repository: { find: jest.Mock; save: jest.Mock };
  let etablissementsService: { updateStatut: jest.Mock };
  let auditService: { log: jest.Mock };
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
    etablissementsService = { updateStatut: jest.fn() };
    auditService = { log: jest.fn() };
    service = new SubscriptionLifecycleService(repository as any, etablissementsService as any, auditService as any);
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
});
