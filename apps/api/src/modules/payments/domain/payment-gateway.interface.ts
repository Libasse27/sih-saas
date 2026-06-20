import { PaymentProviderType } from '@sih-saas/shared';

export interface InitierPaymentInput {
  reference: string;
  montant: number;
  devise: string;
  etablissementId: string;
}

export interface InitierPaymentOutput {
  redirectUrl: string;
  providerReference: string;
}

export interface StatutPaiementExtrait {
  reference: string;
  statut: 'REUSSI' | 'ECHOUE';
}

/**
 * Couche abstraite commune aux passerelles (Stripe / Wave / Orange Money / Carte —
 * prompt maître §15). Seules SANDBOX/WAVE/ORANGE_MONEY sont câblées pour l'instant ; ajouter
 * une nouvelle passerelle = implémenter cette interface, rien d'autre à modifier.
 *
 * `verifierWebhook`/`extraireStatutPaiement` reçoivent les en-têtes bruts (pas un seul header
 * `signature`) car chaque fournisseur a son propre schéma : Wave signe via `Wave-Signature`,
 * Orange Money n'a aucun schéma de signature documenté et se reconfirme via un appel serveur-à-
 * serveur (`transactionstatus`) — d'où la signature async sur les deux méthodes.
 */
export interface PaymentGateway {
  readonly type: PaymentProviderType;
  initier(input: InitierPaymentInput): Promise<InitierPaymentOutput>;
  verifierWebhook(rawBody: string, headers: Record<string, string | undefined>): Promise<boolean>;
  /** Traduit le payload propre au fournisseur vers notre format générique {reference, statut}. */
  extraireStatutPaiement(rawBody: string, headers: Record<string, string | undefined>): Promise<StatutPaiementExtrait>;
  /** Prend `providerReference` (Payment.providerReference), JAMAIS notre `reference` interne — Wave/Orange Money ne connaissent que leur propre identifiant. */
  rembourser(providerReference: string, montant?: number): Promise<void>;
}
