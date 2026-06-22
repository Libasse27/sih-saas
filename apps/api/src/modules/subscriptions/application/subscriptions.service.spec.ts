import { ForbiddenException } from '@nestjs/common';
import { ClinicalModule, EtablissementStatut, Periodicite, SubscriptionStatut } from '@sih-saas/shared';
import { PlanEntity } from '../../plans/infrastructure/entities/plan.entity';
import { SubscriptionEntity } from '../infrastructure/entities/subscription.entity';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  let repository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let plansService: { findById: jest.Mock };
  let etablissementsService: {
    setAbonnementActif: jest.Mock;
    updateStatut: jest.Mock;
    findById: jest.Mock;
    countParStatut: jest.Mock;
    sommeUsage: jest.Mock;
  };
  let auditService: { log: jest.Mock };
  let service: SubscriptionsService;

  const buildPlan = (overrides: Partial<PlanEntity> = {}): PlanEntity =>
    ({
      id: 'plan-1',
      code: 'PROFESSIONNEL',
      nom: 'Professionnel',
      description: null,
      tarifs: { mensuel: 100000, annuel: 1080000, devise: 'XOF' },
      limites: { maxUtilisateurs: 5, maxLits: 50, maxStockageMo: 5000 },
      modules: [ClinicalModule.DME, ClinicalModule.RDV],
      features: { supportPrioritaire: false, apiAccess: false, multiSites: false },
      essaiGratuitJours: 0,
      visible: true,
      actif: true,
      ordreAffichage: 0,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as PlanEntity;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => entity),
      find: jest.fn().mockResolvedValue([]),
    };
    plansService = { findById: jest.fn() };
    etablissementsService = {
      setAbonnementActif: jest.fn(),
      updateStatut: jest.fn(),
      findById: jest.fn(),
      countParStatut: jest.fn().mockResolvedValue({}),
      sommeUsage: jest.fn().mockResolvedValue({ utilisateurs: 0, lits: 0, stockageMo: 0 }),
    };
    auditService = { log: jest.fn() };

    service = new SubscriptionsService(
      repository as any,
      plansService as any,
      etablissementsService as any,
      auditService as any,
    );
  });

  describe('subscribe', () => {
    it("crée un abonnement ACTIF immédiatement quand le plan n'offre pas d'essai gratuit", async () => {
      plansService.findById.mockResolvedValue(buildPlan());

      const subscription = await service.subscribe(
        'etab-1',
        { planId: 'plan-1', periodicite: Periodicite.MENSUEL },
        'admin-1',
      );

      expect(subscription.statut).toBe(SubscriptionStatut.ACTIF);
      expect(subscription.montant).toBe(100000);
      expect(etablissementsService.setAbonnementActif).toHaveBeenCalledWith('etab-1', subscription.id);
      expect(etablissementsService.updateStatut).toHaveBeenCalledWith('etab-1', EtablissementStatut.ACTIF, 'admin-1');
    });

    it("démarre en ESSAI et à montant 0 quand le plan offre un essai gratuit", async () => {
      plansService.findById.mockResolvedValue(buildPlan({ essaiGratuitJours: 14 }));

      const subscription = await service.subscribe(
        'etab-1',
        { planId: 'plan-1', periodicite: Periodicite.ANNUEL },
        'admin-1',
      );

      expect(subscription.statut).toBe(SubscriptionStatut.ESSAI);
      expect(subscription.montant).toBe(0);
    });

    it('utilise montantOverride (coupon déjà appliqué par PaymentsService) au lieu de calculerMontant', async () => {
      plansService.findById.mockResolvedValue(buildPlan());

      const subscription = await service.subscribe(
        'etab-1',
        { planId: 'plan-1', periodicite: Periodicite.MENSUEL, couponApplique: 'PROMO20', montantOverride: 80000 },
        'admin-1',
      );

      expect(subscription.montant).toBe(80000);
      expect(subscription.couponApplique).toBe('PROMO20');
    });

    it('ignore montantOverride pendant un essai gratuit (toujours 0)', async () => {
      plansService.findById.mockResolvedValue(buildPlan({ essaiGratuitJours: 14 }));

      const subscription = await service.subscribe(
        'etab-1',
        { planId: 'plan-1', periodicite: Periodicite.ANNUEL, montantOverride: 80000 },
        'admin-1',
      );

      expect(subscription.montant).toBe(0);
    });

    it('grandfathering : modifier le Plan après coup ne change pas le planSnapshot déjà figé', async () => {
      const plan = buildPlan();
      plansService.findById.mockResolvedValue(plan);

      const subscription = await service.subscribe(
        'etab-1',
        { planId: 'plan-1', periodicite: Periodicite.MENSUEL },
        'admin-1',
      );

      // Le catalogue change après coup (ex. augmentation de prix, nouvelle limite)...
      plan.tarifs = { mensuel: 999999, annuel: 999999, devise: 'XOF' };
      plan.limites = { maxUtilisateurs: 1, maxLits: 1, maxStockageMo: 1 };
      plan.version = 2;

      // ...le snapshot déjà copié dans l'abonnement existant ne doit pas bouger.
      expect(subscription.planSnapshot.tarifs.mensuel).toBe(100000);
      expect(subscription.planSnapshot.limites.maxUtilisateurs).toBe(5);
      expect(subscription.planSnapshot.version).toBe(1);
    });
  });

  describe('migratePlan', () => {
    it('re-snapshote depuis la version actuelle du catalogue', async () => {
      const existing = {
        id: 'sub-1',
        etablissementId: 'etab-1',
        planId: 'plan-1',
        planSnapshot: { planId: 'plan-1', code: 'PRO', nom: 'Pro', tarifs: { mensuel: 100000, annuel: 0, devise: 'XOF' }, limites: { maxUtilisateurs: 5, maxLits: 50, maxStockageMo: 5000 }, modules: [], features: { supportPrioritaire: false, apiAccess: false, multiSites: false }, version: 1 },
        periodicite: Periodicite.MENSUEL,
        historique: [],
      } as unknown as SubscriptionEntity;
      repository.findOne.mockResolvedValue(existing);
      plansService.findById.mockResolvedValue(buildPlan({ version: 2, tarifs: { mensuel: 150000, annuel: 0, devise: 'XOF' } }));

      const updated = await service.migratePlan('sub-1', 'admin-1');

      expect(updated.planSnapshot.version).toBe(2);
      expect(updated.montant).toBe(150000);
      expect(updated.historique.at(-1)?.action).toBe('subscription.migrate_plan');
    });
  });

  describe('assertWithinLimit', () => {
    function buildActiveSubscription(limites: Record<string, number>): SubscriptionEntity {
      return {
        id: 'sub-1',
        etablissementId: 'etab-1',
        statut: SubscriptionStatut.ACTIF,
        planSnapshot: { limites },
      } as unknown as SubscriptionEntity;
    }

    it("bloque la création si la limite du forfait est atteinte", async () => {
      repository.findOne.mockResolvedValue(buildActiveSubscription({ maxUtilisateurs: 5 }));
      etablissementsService.findById.mockResolvedValue({ usage: { utilisateurs: 5, lits: 0, stockageMo: 0 } });

      await expect(service.assertWithinLimit('etab-1', 'maxUtilisateurs')).rejects.toThrow(ForbiddenException);
    });

    it('autorise si la limite n’est pas atteinte', async () => {
      repository.findOne.mockResolvedValue(buildActiveSubscription({ maxUtilisateurs: 5 }));
      etablissementsService.findById.mockResolvedValue({ usage: { utilisateurs: 4, lits: 0, stockageMo: 0 } });

      await expect(service.assertWithinLimit('etab-1', 'maxUtilisateurs')).resolves.not.toThrow();
    });

    it('autorise toujours quand la limite est illimitée (-1)', async () => {
      repository.findOne.mockResolvedValue(buildActiveSubscription({ maxUtilisateurs: -1 }));

      await expect(service.assertWithinLimit('etab-1', 'maxUtilisateurs')).resolves.not.toThrow();
      expect(etablissementsService.findById).not.toHaveBeenCalled();
    });

    it("bloque si l'établissement n'a aucun abonnement actif", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.assertWithinLimit('etab-1', 'maxUtilisateurs')).rejects.toThrow(ForbiddenException);
    });

    /**
     * `delta` (Phase 33, maxStockageMo) : un upload de plusieurs Mo doit être vérifié comme un AJOUT
     * à l'usage courant, pas seulement comparé à l'état courant — sinon un fichier de 50 Mo passerait
     * le contrôle tant que l'usage actuel est strictement inférieur à la limite, même de 1 Mo.
     */
    it('avec delta : bloque un upload qui ferait dépasser la limite même si l’usage actuel est sous la limite', async () => {
      repository.findOne.mockResolvedValue(buildActiveSubscription({ maxStockageMo: 1000 }));
      etablissementsService.findById.mockResolvedValue({ usage: { utilisateurs: 0, lits: 0, stockageMo: 990 } });

      await expect(service.assertWithinLimit('etab-1', 'maxStockageMo', 50)).rejects.toThrow(ForbiddenException);
    });

    it('avec delta : autorise un upload qui reste dans la limite', async () => {
      repository.findOne.mockResolvedValue(buildActiveSubscription({ maxStockageMo: 1000 }));
      etablissementsService.findById.mockResolvedValue({ usage: { utilisateurs: 0, lits: 0, stockageMo: 900 } });

      await expect(service.assertWithinLimit('etab-1', 'maxStockageMo', 50)).resolves.not.toThrow();
    });

    it('delta par défaut (1) préserve exactement le comportement historique des compteurs discrets', async () => {
      repository.findOne.mockResolvedValue(buildActiveSubscription({ maxLits: 10 }));
      etablissementsService.findById.mockResolvedValue({ usage: { utilisateurs: 0, lits: 9, stockageMo: 0 } });

      await expect(service.assertWithinLimit('etab-1', 'maxLits')).resolves.not.toThrow();
    });
  });

  describe('assertMultiSitesAutorise', () => {
    function buildActiveSubscription(multiSites: boolean): SubscriptionEntity {
      return {
        id: 'sub-1',
        etablissementId: 'etab-1',
        statut: SubscriptionStatut.ACTIF,
        planSnapshot: { features: { supportPrioritaire: false, apiAccess: false, multiSites } },
      } as unknown as SubscriptionEntity;
    }

    it("bloque si l'établissement n'a aucun abonnement actif", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.assertMultiSitesAutorise('etab-1', 0)).rejects.toThrow(ForbiddenException);
    });

    it("bloque la création d'un 2e site quand le forfait n'inclut pas multiSites", async () => {
      repository.findOne.mockResolvedValue(buildActiveSubscription(false));

      await expect(service.assertMultiSitesAutorise('etab-1', 1)).rejects.toThrow(ForbiddenException);
    });

    it('autorise le 1er site même sans multiSites', async () => {
      repository.findOne.mockResolvedValue(buildActiveSubscription(false));

      await expect(service.assertMultiSitesAutorise('etab-1', 0)).resolves.not.toThrow();
    });

    it('autorise un nombre illimité de sites quand le forfait inclut multiSites', async () => {
      repository.findOne.mockResolvedValue(buildActiveSubscription(true));

      await expect(service.assertMultiSitesAutorise('etab-1', 5)).resolves.not.toThrow();
    });
  });

  describe('hasModule', () => {
    it('renvoie true si le module fait partie du planSnapshot actif', async () => {
      repository.findOne.mockResolvedValue({
        planSnapshot: { modules: [ClinicalModule.DME, ClinicalModule.IMAGERIE] },
      } as unknown as SubscriptionEntity);

      await expect(service.hasModule('etab-1', ClinicalModule.IMAGERIE)).resolves.toBe(true);
      await expect(service.hasModule('etab-1', ClinicalModule.PHARMACIE)).resolves.toBe(false);
    });

    it('renvoie false en l’absence d’abonnement actif', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.hasModule('etab-1', ClinicalModule.DME)).resolves.toBe(false);
    });
  });

  describe('getStatistiquesPlateforme', () => {
    it('renvoie MRR/ARR nuls sans abonnement actif', async () => {
      const stats = await service.getStatistiquesPlateforme();

      expect(stats.mrr).toBe(0);
      expect(stats.arr).toBe(0);
      expect(stats.abonnementsActifs).toBe(0);
      expect(stats.devise).toBe('XOF');
    });

    it('additionne les abonnements mensuels et convertit les annuels en équivalent mensuel', async () => {
      repository.find.mockResolvedValue([
        { montant: 100000, periodicite: Periodicite.MENSUEL, statut: SubscriptionStatut.ACTIF },
        { montant: 1200000, periodicite: Periodicite.ANNUEL, statut: SubscriptionStatut.EN_PERIODE_GRACE },
      ]);

      const stats = await service.getStatistiquesPlateforme();

      // 100000 (mensuel) + 1200000/12 = 100000 (équivalent mensuel de l'annuel) = 200000
      expect(stats.mrr).toBe(200000);
      expect(stats.arr).toBe(2400000);
      expect(stats.abonnementsActifs).toBe(2);
    });

    it('relaie les compteurs établissements/usage de EtablissementsService', async () => {
      etablissementsService.countParStatut.mockResolvedValue({ [EtablissementStatut.ACTIF]: 4 });
      etablissementsService.sommeUsage.mockResolvedValue({ utilisateurs: 10, lits: 30, stockageMo: 500 });

      const stats = await service.getStatistiquesPlateforme();

      expect(stats.etablissements).toEqual({ [EtablissementStatut.ACTIF]: 4 });
      expect(stats.usage).toEqual({ utilisateurs: 10, lits: 30, stockageMo: 500 });
    });
  });
});
