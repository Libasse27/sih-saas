import { ClinicalModule } from '../enums/clinical-module.enum';

export interface PlanTarifs {
  mensuel: number;
  annuel: number;
  devise: string;
}

/** -1 = illimité — référence : prompt maître §8 et docs/phase-0/modele-de-donnees.md §2.1. */
export interface PlanLimites {
  maxUtilisateurs: number;
  maxLits: number;
  maxStockageMo: number;
}

export interface PlanFeatures {
  supportPrioritaire: boolean;
  apiAccess: boolean;
  multiSites: boolean;
}

/**
 * Copie figée d'un Plan au moment de la souscription (Subscription.planSnapshot).
 * Toutes les vérifications de feature/limite lisent CE snapshot, jamais la table `plans`
 * directement — c'est le mécanisme de grandfathering (docs/phase-0/strategie-isolation.md
 * n'en parle pas, voir plutôt modele-de-donnees.md §2.1 et le prompt maître §8).
 */
export interface PlanSnapshot {
  planId: string;
  code: string;
  nom: string;
  tarifs: PlanTarifs;
  limites: PlanLimites;
  modules: ClinicalModule[];
  features: PlanFeatures;
  version: number;
}
