import { ConfigService } from '@nestjs/config';
import { SubscriptionStatut } from '@sih-saas/shared';
import { MailService } from './mail.service';

describe('MailService', () => {
  let configService: { get: jest.Mock };
  let settingsService: { getOrCreate: jest.Mock };
  let service: MailService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'mail.from') return 'no-reply@sih-saas.sn';
        if (key === 'mail.transport') return 'json'; // jsonTransport, aucun réseau
        return undefined;
      }),
    };
    settingsService = {
      getOrCreate: jest.fn().mockResolvedValue({ email: { nomExpediteur: null, emailExpediteur: null, emailSupport: null } }),
    };
    service = new MailService(configService as unknown as ConfigService, settingsService as any);
  });

  describe('envoyerRelanceAbonnement', () => {
    it.each([SubscriptionStatut.EN_PERIODE_GRACE, SubscriptionStatut.EXPIRE, SubscriptionStatut.SUSPENDU])(
      'envoie un message pour le statut %s',
      async (statut) => {
        const sendMail = jest.spyOn((service as any).transporter, 'sendMail').mockResolvedValue({ messageId: 'msg-1' });

        await service.envoyerRelanceAbonnement('admin@clinique.sn', 'Clinique Test', statut);

        expect(sendMail).toHaveBeenCalledWith(
          expect.objectContaining({ to: 'admin@clinique.sn', subject: expect.stringContaining('Clinique Test') }),
        );
      },
    );

    it.each([SubscriptionStatut.ACTIF, SubscriptionStatut.ESSAI, SubscriptionStatut.ANNULE, SubscriptionStatut.EN_ATTENTE])(
      'n’envoie rien pour le statut %s (aucune relance pertinente)',
      async (statut) => {
        const sendMail = jest.spyOn((service as any).transporter, 'sendMail');

        await service.envoyerRelanceAbonnement('admin@clinique.sn', 'Clinique Test', statut);

        expect(sendMail).not.toHaveBeenCalled();
      },
    );
  });
});
