import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PaymentProviderType } from '@sih-saas/shared';
import { PaymentGateway } from '../../domain/payment-gateway.interface';
import { OrangeMoneyPaymentGateway } from './orange-money-payment-gateway';
import { SandboxPaymentGateway } from './sandbox-payment-gateway';
import { StripePaymentGateway } from './stripe-payment-gateway';
import { WavePaymentGateway } from './wave-payment-gateway';

/**
 * Point d'entrée unique pour résoudre une passerelle par type — PaymentsService/PaiementsPatientService
 * (Flux A et Flux B) la consomment tous les deux, jamais une passerelle concrète en dur (Phase 17).
 * Ajouter une nouvelle passerelle = l'injecter ici + l'ajouter à la map, rien d'autre à modifier.
 *
 * CARTE = alias de STRIPE (Phase 32, décision validée explicitement) : « carte » désigne le moyen
 * de paiement choisi côté client (mode de paiement de la facture/abonnement), Stripe est le
 * fournisseur qui le traite réellement — une seule instance de passerelle enregistrée sous les deux
 * clés, jamais deux implémentations distinctes.
 */
@Injectable()
export class PaymentGatewayRegistry {
  private readonly gateways: Map<PaymentProviderType, PaymentGateway>;

  constructor(
    sandbox: SandboxPaymentGateway,
    wave: WavePaymentGateway,
    orangeMoney: OrangeMoneyPaymentGateway,
    stripe: StripePaymentGateway,
  ) {
    this.gateways = new Map<PaymentProviderType, PaymentGateway>([
      [PaymentProviderType.SANDBOX, sandbox],
      [PaymentProviderType.WAVE, wave],
      [PaymentProviderType.ORANGE_MONEY, orangeMoney],
      [PaymentProviderType.STRIPE, stripe],
      [PaymentProviderType.CARTE, stripe],
    ]);
  }

  get(type: PaymentProviderType): PaymentGateway {
    const gateway = this.gateways.get(type);
    if (!gateway) {
      throw new ServiceUnavailableException(`Passerelle "${type}" non implémentée.`);
    }
    return gateway;
  }
}
