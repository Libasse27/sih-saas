import { Injectable, Logger, NotImplementedException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderType } from '@sih-saas/shared';
import {
  InitierPaymentInput,
  InitierPaymentOutput,
  PaymentGateway,
  StatutPaiementExtrait,
} from '../../domain/payment-gateway.interface';

const OM_API_BASE = 'https://api.orange.com';

interface OrangeMoneyTokenResponse {
  access_token: string;
  expires_in: number;
}

interface OrangeMoneyWebpaymentResponse {
  payment_url: string;
  pay_token: string;
  notif_token: string;
  status: string;
}

interface OrangeMoneyWebhookBody {
  order_id: string;
  amount: number;
  pay_token: string;
  status?: string;
}

/**
 * Orange Money Web Payment — AUCUNE documentation partenaire officielle n'a pu être consultée
 * (developer.orange.com/apis/om-webpay nécessite un accord partenaire pour les détails techniques).
 * Contrat reconstruit à partir de plusieurs SDK tiers indépendants convergents (PHP/Java) qui
 * s'accordent sur : oauth/v2/token (client_credentials), orange-money-webpay/{env}/v1/webpayment,
 * orange-money-webpay/{env}/v1/transactionstatus. **À reconfirmer dès l'obtention d'un vrai accès
 * partenaire** — en particulier le segment d'environnement ({env}) et le format exact du callback
 * `notif_url`. Aucun schéma de signature de webhook n'étant documenté nulle part, la vérification
 * ne fait JAMAIS confiance au webhook seul : elle reconfirme toujours via un appel serveur-à-serveur
 * `transactionstatus` avant d'accepter un paiement comme réussi.
 *
 * Jamais testée contre un vrai compte marchand (aucune credential fournie, prompt maître Phase 17).
 */
@Injectable()
export class OrangeMoneyPaymentGateway implements PaymentGateway {
  readonly type = PaymentProviderType.ORANGE_MONEY;
  private readonly logger = new Logger(OrangeMoneyPaymentGateway.name);
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  async initier(input: InitierPaymentInput): Promise<InitierPaymentOutput> {
    const merchantKey = this.requireConfig('payments.orangeMoney.merchantKey', 'ORANGE_MONEY_MERCHANT_KEY');
    const token = await this.obtenirToken();
    const env = this.config.get<string>('payments.orangeMoney.env') ?? 'dev';

    const response = await fetch(`${OM_API_BASE}/orange-money-webpay/${env}/v1/webpayment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        merchant_key: merchantKey,
        currency: input.devise,
        order_id: input.reference,
        amount: Math.round(input.montant),
        return_url: this.config.get<string>('payments.successUrl'),
        cancel_url: this.config.get<string>('payments.errorUrl'),
        notif_url: `${this.config.get<string>('apiPublicUrl')}/${this.config.get<string>('apiPrefix')}/payments/webhook/orange-money`,
        lang: 'fr',
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Orange Money webpayment échoué (${response.status}) : ${detail}`);
      throw new ServiceUnavailableException("Échec de l'initiation du paiement Orange Money.");
    }

    const resultat = (await response.json()) as OrangeMoneyWebpaymentResponse;
    return { redirectUrl: resultat.payment_url, providerReference: resultat.pay_token };
  }

  async verifierWebhook(rawBody: string, _headers: Record<string, string | undefined>): Promise<boolean> {
    const payload = this.parserWebhook(rawBody);
    if (!payload) {
      return false;
    }

    try {
      await this.confirmerStatutReel(payload);
      return true;
    } catch (error) {
      this.logger.error(`Reconfirmation Orange Money impossible : ${(error as Error).message}`);
      return false;
    }
  }

  async extraireStatutPaiement(rawBody: string, _headers: Record<string, string | undefined>): Promise<StatutPaiementExtrait> {
    const payload = this.parserWebhook(rawBody);
    if (!payload) {
      throw new ServiceUnavailableException('Webhook Orange Money illisible.');
    }
    const statut = await this.confirmerStatutReel(payload);
    return { reference: payload.order_id, statut };
  }

  /** Aucun endpoint de remboursement documenté pour Orange Money — traitement manuel via le back-office marchand. */
  async rembourser(_providerReference: string, _montant?: number): Promise<void> {
    throw new NotImplementedException(
      'Remboursement Orange Money non automatisable — à traiter manuellement via le back-office marchand Orange.',
    );
  }

  private parserWebhook(rawBody: string): OrangeMoneyWebhookBody | null {
    try {
      const payload = JSON.parse(rawBody) as Partial<OrangeMoneyWebhookBody>;
      if (!payload.order_id || !payload.amount || !payload.pay_token) {
        return null;
      }
      return payload as OrangeMoneyWebhookBody;
    } catch {
      return null;
    }
  }

  /** Source de vérité réelle : jamais le statut du webhook seul, toujours reconfirmé en direct. */
  private async confirmerStatutReel(payload: OrangeMoneyWebhookBody): Promise<'REUSSI' | 'ECHOUE'> {
    const token = await this.obtenirToken();
    const env = this.config.get<string>('payments.orangeMoney.env') ?? 'dev';

    const response = await fetch(`${OM_API_BASE}/orange-money-webpay/${env}/v1/transactionstatus`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ order_id: payload.order_id, amount: payload.amount, pay_token: payload.pay_token }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException('Échec de la vérification du statut Orange Money.');
    }

    const resultat = (await response.json()) as { status: string };
    return resultat.status?.toUpperCase() === 'SUCCESS' ? 'REUSSI' : 'ECHOUE';
  }

  private async obtenirToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    const clientId = this.requireConfig('payments.orangeMoney.clientId', 'ORANGE_MONEY_CLIENT_ID');
    const clientSecret = this.requireConfig('payments.orangeMoney.clientSecret', 'ORANGE_MONEY_CLIENT_SECRET');
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(`${OM_API_BASE}/oauth/v2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new ServiceUnavailableException("Échec de l'authentification OAuth2 Orange Money.");
    }

    const resultat = (await response.json()) as OrangeMoneyTokenResponse;
    // Marge de 30s avant l'expiration réelle pour éviter d'utiliser un jeton à la limite.
    this.tokenCache = { token: resultat.access_token, expiresAt: Date.now() + (resultat.expires_in - 30) * 1000 };
    return resultat.access_token;
  }

  private requireConfig(cle: string, variableEnv: string): string {
    const valeur = this.config.get<string>(cle);
    if (!valeur) {
      throw new ServiceUnavailableException(
        `Passerelle Orange Money non configurée — variable d'environnement ${variableEnv} manquante.`,
      );
    }
    return valeur;
  }
}
