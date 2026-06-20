import { Injectable, Logger } from '@nestjs/common';
import { PushNotification, PushProvider } from '../../domain/push-provider.interface';

/**
 * Aucun appel réseau réel (pas de credentials Firebase/APNS disponibles) — journalise uniquement.
 * À remplacer par une implémentation Firebase Cloud Messaging quand de vraies clés seront fournies
 * (même réserve que SandboxPaymentGateway, Phase 4).
 */
@Injectable()
export class SandboxPushProvider implements PushProvider {
  private readonly logger = new Logger(SandboxPushProvider.name);

  async envoyer(token: string, notification: PushNotification): Promise<void> {
    this.logger.log(`[sandbox] push -> ${token.slice(0, 12)}… : ${notification.titre} — ${notification.corps}`);
  }
}
