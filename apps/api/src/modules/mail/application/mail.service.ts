import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatut } from '@sih-saas/shared';
import * as nodemailer from 'nodemailer';
import { SettingsService } from '../../settings/application/settings.service';

const MESSAGES_RELANCE: Partial<Record<SubscriptionStatut, (nom: string) => { sujet: string; texte: string }>> = {
  [SubscriptionStatut.EN_PERIODE_GRACE]: (nom) => ({
    sujet: `Abonnement expiré — période de grâce pour ${nom}`,
    texte: `L'abonnement de « ${nom} » a expiré. Vous disposez d'une période de grâce avant toute restriction d'accès — renouvelez dès que possible depuis votre console.`,
  }),
  [SubscriptionStatut.EXPIRE]: (nom) => ({
    sujet: `Période de grâce terminée pour ${nom}`,
    texte: `La période de grâce de « ${nom} » est terminée. Renouvelez votre abonnement sans délai pour éviter une suspension de l'accès à la plateforme.`,
  }),
  [SubscriptionStatut.SUSPENDU]: (nom) => ({
    sujet: `Établissement suspendu : ${nom}`,
    texte: `L'accès de « ${nom} » à la plateforme est désormais suspendu, faute de renouvellement d'abonnement. Renouvelez depuis votre console pour rétablir l'accès immédiatement.`,
  }),
};

/**
 * Transport dev par défaut (`jsonTransport`) : aucune connexion réseau, le message est
 * simplement journalisé — exactement l'esprit « API sandbox d'abord » du prompt maître.
 * Pour un vrai SMTP, renseigner MAIL_TRANSPORT=smtp + MAIL_HOST/MAIL_PORT/MAIL_USER/MAIL_PASSWORD.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(
    private readonly config: ConfigService,
    private readonly settingsService: SettingsService,
  ) {
    this.from = this.config.get<string>('mail.from')!;

    if (this.config.get<string>('mail.transport') === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('mail.host'),
        port: this.config.get<number>('mail.port'),
        auth: {
          user: this.config.get<string>('mail.user'),
          pass: this.config.get<string>('mail.password'),
        },
      });
    } else {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    }
  }

  async envoyerBienvenue(destinataire: string, nomEtablissement: string): Promise<void> {
    const settings = await this.settingsService.getOrCreate();
    const from = settings.email.emailExpediteur
      ? `${settings.email.nomExpediteur ?? 'SIH SaaS'} <${settings.email.emailExpediteur}>`
      : this.from;
    const contactSupport = settings.email.emailSupport
      ? ` Pour toute question, contactez ${settings.email.emailSupport}.`
      : '';

    const info = await this.transporter.sendMail({
      from,
      to: destinataire,
      subject: `Bienvenue sur SIH SaaS, ${nomEtablissement} !`,
      text: `Votre établissement « ${nomEtablissement} » est prêt. Connectez-vous pour commencer à l'utiliser.${contactSupport}`,
    });

    this.logger.log(`Email de bienvenue envoyé à ${destinataire} (messageId=${info.messageId})`);
  }

  /**
   * Dunning (prompt maître §9) — un message par étape du cycle de vie (SubscriptionLifecycleService),
   * jamais pour ACTIF/ESSAI/ANNULE/EN_ATTENTE (aucune relance n'a de sens pour ces statuts).
   */
  async envoyerRelanceAbonnement(destinataire: string, nomEtablissement: string, statut: SubscriptionStatut): Promise<void> {
    const construireMessage = MESSAGES_RELANCE[statut];
    if (!construireMessage) {
      return;
    }
    const { sujet, texte } = construireMessage(nomEtablissement);

    const settings = await this.settingsService.getOrCreate();
    const from = settings.email.emailExpediteur
      ? `${settings.email.nomExpediteur ?? 'SIH SaaS'} <${settings.email.emailExpediteur}>`
      : this.from;
    const contactSupport = settings.email.emailSupport
      ? ` Pour toute question, contactez ${settings.email.emailSupport}.`
      : '';

    const info = await this.transporter.sendMail({
      from,
      to: destinataire,
      subject: sujet,
      text: `${texte}${contactSupport}`,
    });

    this.logger.log(`Email de relance (${statut}) envoyé à ${destinataire} (messageId=${info.messageId})`);
  }
}
