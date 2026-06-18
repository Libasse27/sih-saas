import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderType } from '@sih-saas/shared';
import * as crypto from 'crypto';
import {
  InitierPaymentInput,
  InitierPaymentOutput,
  PaymentGateway,
} from '../../domain/payment-gateway.interface';

/**
 * Passerelle de développement/test — aucun appel réseau, signature HMAC-SHA256 réelle
 * (mêmes garanties de vérification qu'une vraie passerelle). « API sandbox d'abord »
 * (contexte Sénégal/Afrique de l'Ouest, prompt maître). À remplacer/compléter par
 * Stripe/Wave/Orange Money quand de vraies clés API seront fournies.
 */
@Injectable()
export class SandboxPaymentGateway implements PaymentGateway {
  readonly type = PaymentProviderType.SANDBOX;

  constructor(private readonly config: ConfigService) {}

  async initier(input: InitierPaymentInput): Promise<InitierPaymentOutput> {
    return {
      redirectUrl: `https://sandbox-payments.sih-saas.local/checkout/${input.reference}`,
      providerReference: input.reference,
    };
  }

  verifierWebhook(rawBody: string, signature: string | undefined): boolean {
    if (!signature) {
      return false;
    }

    const secret = this.config.get<string>('payments.sandboxWebhookSecret')!;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  }

  async rembourser(): Promise<void> {
    // Pas de mouvement d'argent réel en sandbox — no-op volontaire.
  }
}
