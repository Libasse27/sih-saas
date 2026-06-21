import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderType } from '@sih-saas/shared';
import * as crypto from 'crypto';
import {
  InitierPaymentInput,
  InitierPaymentOutput,
  PaymentGateway,
  StatutPaiementExtrait,
} from '../../domain/payment-gateway.interface';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const TOLERANCE_REPLAY_SECONDES = 300;

interface StripeCheckoutSessionResponse {
  id: string;
  url: string;
}

interface StripeCheckoutSessionRetrieved {
  payment_intent: string | null;
}

interface StripeWebhookEvent {
  type: string;
  data: {
    object: {
      client_reference_id: string | null;
      payment_status?: 'paid' | 'unpaid' | 'no_payment_required';
    };
  };
}

/**
 * Stripe Checkout Sessions — contrat vérifié sur la documentation officielle publique
 * (https://docs.stripe.com/api/checkout/sessions/create, https://docs.stripe.com/webhooks/signatures,
 * https://docs.stripe.com/api/refunds/create) au moment de l'écriture. Jamais testée contre un vrai
 * compte (aucune credential fournie, même réserve que Wave/Orange Money — Phase 17/32).
 *
 * RÉSERVE IMPORTANTE, distincte de Wave/Orange Money : la documentation Stripe consultée ne confirme
 * PAS le XOF (FCFA) comme devise de règlement/présentement supportée, ni comme devise "zero-decimal"
 * — contrairement à Wave/Orange Money qui opèrent nativement en XOF. Ce code suppose XOF zero-decimal
 * (comme Wave) par cohérence avec le reste du projet, mais la viabilité réelle de Stripe pour des
 * paiements par carte facturés en FCFA au Sénégal N'EST PAS CONFIRMÉE — à valider auprès de Stripe
 * (ou d'un agrégateur régional alternatif type CinetPay/PayDunya) avant tout déploiement réel.
 */
@Injectable()
export class StripePaymentGateway implements PaymentGateway {
  readonly type = PaymentProviderType.STRIPE;
  private readonly logger = new Logger(StripePaymentGateway.name);

  constructor(private readonly config: ConfigService) {}

  async initier(input: InitierPaymentInput): Promise<InitierPaymentOutput> {
    const secretKey = this.requireConfig('payments.stripe.secretKey', 'STRIPE_SECRET_KEY');

    const params = new URLSearchParams({
      mode: 'payment',
      'line_items[0][price_data][currency]': input.devise.toLowerCase(),
      // XOF supposée zero-decimal (voir réserve en tête de fichier) — jamais ×100, contrairement aux
      // devises à décimales (USD/EUR) où `unit_amount` attend des centimes.
      'line_items[0][price_data][unit_amount]': String(Math.round(input.montant)),
      'line_items[0][price_data][product_data][name]': `SIH SaaS — ${input.reference}`,
      'line_items[0][quantity]': '1',
      success_url: this.config.get<string>('payments.successUrl')!,
      cancel_url: this.config.get<string>('payments.errorUrl')!,
      client_reference_id: input.reference,
    });

    const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(secretKey),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Stripe checkout session échouée (${response.status}) : ${detail}`);
      throw new ServiceUnavailableException("Échec de l'initiation du paiement Stripe.");
    }

    const session = (await response.json()) as StripeCheckoutSessionResponse;
    return { redirectUrl: session.url, providerReference: session.id };
  }

  async verifierWebhook(rawBody: string, headers: Record<string, string | undefined>): Promise<boolean> {
    const header = headers['stripe-signature'];
    if (!header) {
      return false;
    }

    const webhookSecret = this.requireConfig('payments.stripe.webhookSecret', 'STRIPE_WEBHOOK_SECRET');

    // Format : "t=<timestamp>,v1=<hex>[,v0=<hex>]" — v0 est une signature de test, toujours ignorée.
    const parties = Object.fromEntries(header.split(',').map((part) => part.split('=') as [string, string]));
    const timestamp = parties.t;
    const signatureRecue = parties.v1;
    if (!timestamp || !signatureRecue) {
      return false;
    }

    const ageSecondes = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(ageSecondes) || ageSecondes > TOLERANCE_REPLAY_SECONDES) {
      return false;
    }

    const expected = crypto.createHmac('sha256', webhookSecret).update(`${timestamp}.${rawBody}`).digest('hex');

    const recueBuffer = Buffer.from(signatureRecue);
    const expectedBuffer = Buffer.from(expected);
    if (recueBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(recueBuffer, expectedBuffer);
  }

  async extraireStatutPaiement(rawBody: string, _headers: Record<string, string | undefined>): Promise<StatutPaiementExtrait> {
    const event = JSON.parse(rawBody) as StripeWebhookEvent;
    const session = event.data.object;
    const reussi = event.type === 'checkout.session.completed' && session.payment_status === 'paid';
    return { reference: session.client_reference_id ?? '', statut: reussi ? 'REUSSI' : 'ECHOUE' };
  }

  /**
   * `providerReference` ici est l'id de Checkout Session (cs_...), jamais un payment_intent — Stripe
   * ne permet pas de rembourser directement via une session, il faut d'abord la récupérer pour
   * obtenir son `payment_intent` (voir https://docs.stripe.com/api/refunds/create).
   */
  async rembourser(providerReference: string, montant?: number): Promise<void> {
    const secretKey = this.requireConfig('payments.stripe.secretKey', 'STRIPE_SECRET_KEY');
    const auth = this.authHeader(secretKey);

    const sessionResponse = await fetch(`${STRIPE_API_BASE}/checkout/sessions/${providerReference}`, {
      headers: { Authorization: auth },
    });
    if (!sessionResponse.ok) {
      const detail = await sessionResponse.text();
      this.logger.error(`Récupération de la session Stripe échouée (${sessionResponse.status}) : ${detail}`);
      throw new ServiceUnavailableException('Impossible de récupérer la session Stripe pour le remboursement.');
    }

    const session = (await sessionResponse.json()) as StripeCheckoutSessionRetrieved;
    if (!session.payment_intent) {
      throw new ServiceUnavailableException("Cette session Stripe n'a pas encore de paiement à rembourser.");
    }

    const params = new URLSearchParams({ payment_intent: session.payment_intent });
    if (montant !== undefined) {
      params.set('amount', String(Math.round(montant)));
    }

    const response = await fetch(`${STRIPE_API_BASE}/refunds`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Remboursement Stripe échoué (${response.status}) : ${detail}`);
      throw new ServiceUnavailableException('Échec du remboursement Stripe.');
    }
  }

  private authHeader(secretKey: string): string {
    return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
  }

  private requireConfig(cle: string, variableEnv: string): string {
    const valeur = this.config.get<string>(cle);
    if (!valeur) {
      throw new ServiceUnavailableException(
        `Passerelle Stripe non configurée — variable d'environnement ${variableEnv} manquante.`,
      );
    }
    return valeur;
  }
}
