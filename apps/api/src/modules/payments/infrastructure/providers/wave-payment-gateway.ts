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

const WAVE_API_BASE = 'https://api.wave.com/v1';

interface WaveCheckoutSessionResponse {
  id: string;
  wave_launch_url: string;
  transaction_id: string;
}

interface WaveWebhookEvent {
  type: 'checkout.session.completed' | 'checkout.session.payment_failed';
  data: {
    client_reference: string;
    payment_status: 'processing' | 'cancelled' | 'succeeded' | 'failed';
  };
}

/**
 * Wave Business Checkout API — contrat vérifié sur la documentation officielle publique
 * (https://docs.wave.com/checkout, https://docs.wave.com/webhook) au moment de l'écriture.
 * Jamais testée contre un vrai compte marchand (aucune credential fournie, prompt maître Phase 17) —
 * structurellement complète, premier appel réel à faire dès que WAVE_API_KEY/WAVE_WEBHOOK_SECRET
 * seront renseignées.
 */
@Injectable()
export class WavePaymentGateway implements PaymentGateway {
  readonly type = PaymentProviderType.WAVE;
  private readonly logger = new Logger(WavePaymentGateway.name);

  constructor(private readonly config: ConfigService) {}

  async initier(input: InitierPaymentInput): Promise<InitierPaymentOutput> {
    const apiKey = this.requireConfig('payments.wave.apiKey', 'WAVE_API_KEY');

    const response = await fetch(`${WAVE_API_BASE}/checkout/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: String(Math.round(input.montant)),
        currency: input.devise,
        success_url: this.config.get<string>('payments.successUrl'),
        error_url: this.config.get<string>('payments.errorUrl'),
        client_reference: input.reference,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Wave checkout session échouée (${response.status}) : ${detail}`);
      throw new ServiceUnavailableException("Échec de l'initiation du paiement Wave.");
    }

    const session = (await response.json()) as WaveCheckoutSessionResponse;
    return { redirectUrl: session.wave_launch_url, providerReference: session.id };
  }

  async verifierWebhook(rawBody: string, headers: Record<string, string | undefined>): Promise<boolean> {
    const header = headers['wave-signature'];
    if (!header) {
      return false;
    }

    const webhookSecret = this.requireConfig('payments.wave.webhookSecret', 'WAVE_WEBHOOK_SECRET');

    // Format : "t=<timestamp>,v1=<hex>" — voir https://docs.wave.com/webhook.
    const parties = Object.fromEntries(
      header.split(',').map((part) => part.split('=') as [string, string]),
    );
    const timestamp = parties.t;
    const signatureRecue = parties.v1;
    if (!timestamp || !signatureRecue) {
      return false;
    }

    const expected = crypto.createHmac('sha256', webhookSecret).update(`${timestamp}${rawBody}`).digest('hex');

    const recueBuffer = Buffer.from(signatureRecue);
    const expectedBuffer = Buffer.from(expected);
    if (recueBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(recueBuffer, expectedBuffer);
  }

  async extraireStatutPaiement(rawBody: string, _headers: Record<string, string | undefined>): Promise<StatutPaiementExtrait> {
    const event = JSON.parse(rawBody) as WaveWebhookEvent;
    return {
      reference: event.data.client_reference,
      statut: event.data.payment_status === 'succeeded' ? 'REUSSI' : 'ECHOUE',
    };
  }

  /** `providerReference` ici est l'id de session Wave (cos-...), pas notre `reference` interne. */
  async rembourser(providerReference: string): Promise<void> {
    const apiKey = this.requireConfig('payments.wave.apiKey', 'WAVE_API_KEY');

    const response = await fetch(`${WAVE_API_BASE}/checkout/sessions/${providerReference}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Remboursement Wave échoué (${response.status}) : ${detail}`);
      throw new ServiceUnavailableException('Échec du remboursement Wave.');
    }
  }

  private requireConfig(cle: string, variableEnv: string): string {
    const valeur = this.config.get<string>(cle);
    if (!valeur) {
      throw new ServiceUnavailableException(
        `Passerelle Wave non configurée — variable d'environnement ${variableEnv} manquante.`,
      );
    }
    return valeur;
  }
}
