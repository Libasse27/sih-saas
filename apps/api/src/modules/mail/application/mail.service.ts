import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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

  constructor(private readonly config: ConfigService) {
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
    const info = await this.transporter.sendMail({
      from: this.from,
      to: destinataire,
      subject: `Bienvenue sur SIH SaaS, ${nomEtablissement} !`,
      text: `Votre établissement « ${nomEtablissement} » est prêt. Connectez-vous pour commencer à l'utiliser.`,
    });

    this.logger.log(`Email de bienvenue envoyé à ${destinataire} (messageId=${info.messageId})`);
  }
}
