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

/**
 * Couche abstraite commune aux passerelles (Stripe / Wave / Orange Money / Carte —
 * prompt maître §15). Seule SandboxPaymentGateway est câblée pour l'instant ; ajouter
 * une nouvelle passerelle = implémenter cette interface, rien d'autre à modifier.
 */
export interface PaymentGateway {
  readonly type: PaymentProviderType;
  initier(input: InitierPaymentInput): Promise<InitierPaymentOutput>;
  verifierWebhook(rawBody: string, signature: string | undefined): boolean;
  rembourser(reference: string, montant?: number): Promise<void>;
}
