import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ClinicalModule,
  EtablissementStatut,
  Periodicite,
  PlanLimites,
  PlatformStatistiques,
  SubscriptionStatut,
} from '@sih-saas/shared';
import { In, Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { EtablissementsService } from '../../etablissements/application/etablissements.service';
import { EtablissementUsage } from '../../etablissements/infrastructure/entities/etablissement.entity';
import { PlansService } from '../../plans/application/plans.service';
import { buildPlanSnapshot, calculerMontant } from '../domain/plan-snapshot';
import { SubscriptionEntity, SubscriptionHistoriqueEntry } from '../infrastructure/entities/subscription.entity';
import { CreateSubscriptionDto } from '../presentation/dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../presentation/dto/update-subscription.dto';

const STATUTS_ACTIFS = [SubscriptionStatut.ESSAI, SubscriptionStatut.ACTIF, SubscriptionStatut.EN_PERIODE_GRACE];

/** limites.maxXxx -> usage.xxx (les deux objets n'utilisent pas la même convention de nom). */
const LIMITE_VERS_USAGE: Record<keyof PlanLimites, keyof EtablissementUsage> = {
  maxUtilisateurs: 'utilisateurs',
  maxLits: 'lits',
  maxStockageMo: 'stockageMo',
};

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionEntity) private readonly repository: Repository<SubscriptionEntity>,
    private readonly plansService: PlansService,
    private readonly etablissementsService: EtablissementsService,
    private readonly auditService: AuditService,
  ) {}

  async subscribe(
    etablissementId: string,
    dto: CreateSubscriptionDto,
    actingUserId: string,
  ): Promise<SubscriptionEntity> {
    const plan = await this.plansService.findById(dto.planId);
    const snapshot = buildPlanSnapshot(plan);

    const dateDebut = new Date();
    const enEssai = plan.essaiGratuitJours > 0;
    const dateFin = enEssai
      ? this.ajouterJours(dateDebut, plan.essaiGratuitJours)
      : this.ajouterCycle(dateDebut, dto.periodicite);

    const subscription = await this.repository.save(
      this.repository.create({
        etablissementId,
        planId: plan.id,
        planSnapshot: snapshot,
        periodicite: dto.periodicite,
        dateDebut,
        dateFin,
        statut: enEssai ? SubscriptionStatut.ESSAI : SubscriptionStatut.ACTIF,
        // En essai gratuit, toujours 0 — même un coupon ne doit jamais facturer une période d'essai.
        montant: enEssai ? 0 : dto.montantOverride ?? calculerMontant(snapshot, dto.periodicite),
        devise: snapshot.tarifs.devise,
        renouvellementAuto: dto.renouvellementAuto ?? true,
        couponApplique: dto.couponApplique ?? null,
        historique: [this.historiqueEntry('subscription.create', { planCode: plan.code })],
      }),
    );

    await this.etablissementsService.setAbonnementActif(etablissementId, subscription.id);
    await this.etablissementsService.updateStatut(
      etablissementId,
      enEssai ? EtablissementStatut.ESSAI : EtablissementStatut.ACTIF,
      actingUserId,
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'subscription.create',
      ressource: 'subscription',
      ressourceId: subscription.id,
      metadata: { planCode: plan.code, statut: subscription.statut },
    });

    return subscription;
  }

  async findById(id: string): Promise<SubscriptionEntity> {
    const subscription = await this.repository.findOne({ where: { id } });
    if (!subscription) {
      throw new NotFoundException('Abonnement introuvable.');
    }
    return subscription;
  }

  /** Source de vérité pour "l'abonnement actif" — requêté directement, jamais en cache. */
  async getActiveForEtablissement(etablissementId: string): Promise<SubscriptionEntity | null> {
    return this.repository.findOne({
      where: { etablissementId, statut: In(STATUTS_ACTIFS) },
      order: { createdAt: 'DESC' },
    });
  }

  async extend(id: string, jours: number, actingUserId: string): Promise<SubscriptionEntity> {
    const subscription = await this.findById(id);
    subscription.dateFin = this.ajouterJours(subscription.dateFin, jours);
    subscription.historique = [
      ...subscription.historique,
      this.historiqueEntry('subscription.extend', { jours }),
    ];
    const saved = await this.repository.save(subscription);

    await this.auditService.log({
      etablissementId: subscription.etablissementId,
      userId: actingUserId,
      action: 'subscription.extend',
      ressource: 'subscription',
      ressourceId: subscription.id,
      metadata: { jours },
    });

    return saved;
  }

  /** Action super-admin « migrer vers la dernière version du plan » — re-snapshot depuis le catalogue actuel. */
  async migratePlan(id: string, actingUserId: string): Promise<SubscriptionEntity> {
    const subscription = await this.findById(id);
    const plan = await this.plansService.findById(subscription.planId);
    const ancienneVersion = subscription.planSnapshot.version;
    const snapshot = buildPlanSnapshot(plan);

    subscription.planSnapshot = snapshot;
    // Un essai gratuit reste gratuit même si le plan change — pas de facturation pendant la période d'essai.
    if (subscription.statut !== SubscriptionStatut.ESSAI) {
      subscription.montant = calculerMontant(snapshot, subscription.periodicite);
    }
    subscription.historique = [
      ...subscription.historique,
      this.historiqueEntry('subscription.migrate_plan', {
        ancienneVersion,
        nouvelleVersion: snapshot.version,
      }),
    ];
    const saved = await this.repository.save(subscription);

    await this.auditService.log({
      etablissementId: subscription.etablissementId,
      userId: actingUserId,
      action: 'subscription.migrate_plan',
      ressource: 'subscription',
      ressourceId: subscription.id,
      metadata: { ancienneVersion, nouvelleVersion: snapshot.version },
    });

    return saved;
  }

  async updateStatut(id: string, dto: UpdateSubscriptionDto, actingUserId: string): Promise<SubscriptionEntity> {
    const subscription = await this.findById(id);
    const ancienStatut = subscription.statut;

    if (dto.statut) {
      subscription.statut = dto.statut;
    }
    if (dto.renouvellementAuto !== undefined) {
      subscription.renouvellementAuto = dto.renouvellementAuto;
    }
    if (dto.statut && dto.statut !== ancienStatut) {
      subscription.historique = [
        ...subscription.historique,
        this.historiqueEntry('subscription.statut_update', { ancienStatut, nouveauStatut: dto.statut }),
      ];
    }

    const saved = await this.repository.save(subscription);

    await this.auditService.log({
      etablissementId: subscription.etablissementId,
      userId: actingUserId,
      action: 'subscription.update',
      ressource: 'subscription',
      ressourceId: subscription.id,
      metadata: { ancienStatut, nouveauStatut: subscription.statut },
    });

    return saved;
  }

  /**
   * Lit le planSnapshot — jamais le catalogue `plans` directement (grandfathering, prompt maître §8).
   * `delta` = quantité que l'appelant s'apprête à ajouter (1 pour un compteur discret comme
   * maxUtilisateurs/maxLits — valeur par défaut, comportement inchangé ; la taille en Mo pour
   * maxStockageMo, où `usageActuel >= limite` seul ne suffit pas : un upload de plusieurs Mo pourrait
   * dépasser largement la limite tout en passant le contrôle si on ne vérifie pas l'AJOUT, pas
   * seulement l'état courant).
   */
  async assertWithinLimit(etablissementId: string, champ: keyof PlanLimites, delta = 1): Promise<void> {
    const subscription = await this.getActiveForEtablissement(etablissementId);
    if (!subscription) {
      throw new ForbiddenException("Aucun abonnement actif pour cet établissement.");
    }

    const limite = subscription.planSnapshot.limites[champ];
    if (limite === -1) {
      return; // illimité
    }

    const etablissement = await this.etablissementsService.findById(etablissementId);
    const usageActuel = etablissement.usage[LIMITE_VERS_USAGE[champ]];

    if (usageActuel + delta > limite) {
      throw new ForbiddenException(
        `Limite du forfait atteinte (${champ} : ${usageActuel}/${limite}). Mettez à niveau votre abonnement.`,
      );
    }
  }

  /**
   * Garde Phase 34 (`Plan.features.multiSites`, prompt maître §8) — symétrique à
   * `assertWithinLimit` mais pour une feature booléenne plutôt qu'une limite numérique : le compte
   * de sites actuels est calculé par l'appelant (`SitesService.create()`) plutôt que recompté ici,
   * pour éviter une dépendance circulaire `SubscriptionsModule ↔ AdmissionsLitsModule`.
   */
  async assertMultiSitesAutorise(etablissementId: string, sitesActuels: number): Promise<void> {
    const subscription = await this.getActiveForEtablissement(etablissementId);
    if (!subscription) {
      throw new ForbiddenException("Aucun abonnement actif pour cet établissement.");
    }

    if (subscription.planSnapshot.features.multiSites) {
      return;
    }

    if (sitesActuels >= 1) {
      throw new ForbiddenException(
        "Votre forfait ne permet qu'un seul site. Passez à un forfait supérieur pour activer le multi-sites.",
      );
    }
  }

  /** requirePlanFeature() — voir domain/plan-feature.guard.ts. */
  async hasModule(etablissementId: string, module: ClinicalModule): Promise<boolean> {
    const subscription = await this.getActiveForEtablissement(etablissementId);
    return subscription?.planSnapshot.modules.includes(module) ?? false;
  }

  /**
   * Dashboard super-admin (Phase 9, prompt maître §10.2) : établissements actifs/suspendus/expirés,
   * MRR/ARR, usage stockage. MRR = Σ équivalent-mensuel des abonnements ACTIF/EN_PERIODE_GRACE
   * (l'ESSAI ne génère aucun revenu — montant=0 par construction dans subscribe(), exclu malgré tout
   * pour rester explicite). ARR = MRR×12. Toujours en XOF (plateforme mono-devise).
   */
  async getStatistiquesPlateforme(): Promise<PlatformStatistiques> {
    const [etablissements, usage, abonnementsActifs] = await Promise.all([
      this.etablissementsService.countParStatut(),
      this.etablissementsService.sommeUsage(),
      this.repository.find({
        where: { statut: In([SubscriptionStatut.ACTIF, SubscriptionStatut.EN_PERIODE_GRACE]) },
      }),
    ]);

    const mrr = abonnementsActifs.reduce((total, abonnement) => {
      const equivalentMensuel =
        abonnement.periodicite === Periodicite.MENSUEL ? abonnement.montant : Number(abonnement.montant) / 12;
      return total + Number(equivalentMensuel);
    }, 0);

    return {
      etablissements,
      usage,
      abonnementsActifs: abonnementsActifs.length,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      devise: 'XOF',
    };
  }

  private historiqueEntry(action: string, details?: Record<string, unknown>): SubscriptionHistoriqueEntry {
    return { date: new Date().toISOString(), action, details };
  }

  private ajouterJours(date: Date, jours: number): Date {
    const resultat = new Date(date);
    resultat.setDate(resultat.getDate() + jours);
    return resultat;
  }

  private ajouterCycle(date: Date, periodicite: Periodicite): Date {
    const resultat = new Date(date);
    if (periodicite === Periodicite.MENSUEL) {
      resultat.setMonth(resultat.getMonth() + 1);
    } else {
      resultat.setFullYear(resultat.getFullYear() + 1);
    }
    return resultat;
  }
}
