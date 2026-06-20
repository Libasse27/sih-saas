import { NotImplementedException, ServiceUnavailableException } from '@nestjs/common';
import { OrangeMoneyPaymentGateway } from './orange-money-payment-gateway';

describe('OrangeMoneyPaymentGateway', () => {
  let config: { get: jest.Mock };
  let gateway: OrangeMoneyPaymentGateway;
  let fetchMock: jest.Mock;

  const valeursConfig: Record<string, string> = {
    'payments.orangeMoney.merchantKey': 'merchant-key-1',
    'payments.orangeMoney.clientId': 'client-1',
    'payments.orangeMoney.clientSecret': 'secret-1',
    'payments.orangeMoney.env': 'dev',
    'payments.successUrl': 'https://sih-saas.local/paiement/succes',
    'payments.errorUrl': 'https://sih-saas.local/paiement/echec',
    apiPublicUrl: 'https://api.sih-saas.local',
    apiPrefix: 'api',
  };

  beforeEach(() => {
    config = { get: jest.fn((cle: string) => valeursConfig[cle]) };
    gateway = new OrangeMoneyPaymentGateway(config as any);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  function mockToken() {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok-1', expires_in: 3600 }) });
  }

  describe('initier', () => {
    it("récupère un jeton OAuth2 puis crée le paiement web", async () => {
      mockToken();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment_url: 'https://om.sn/pay/abc', pay_token: 'pay-tok-1', notif_token: 'n1', status: 'INITIATED' }),
      });

      const result = await gateway.initier({ reference: 'ref-1', montant: 25000, devise: 'XOF', etablissementId: 'etab-1' });

      expect(result).toEqual({ redirectUrl: 'https://om.sn/pay/abc', providerReference: 'pay-tok-1' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.orange.com/oauth/v2/token');
      expect(fetchMock.mock.calls[1][0]).toBe('https://api.orange.com/orange-money-webpay/dev/v1/webpayment');
      const body = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(body).toEqual(
        expect.objectContaining({ merchant_key: 'merchant-key-1', order_id: 'ref-1', amount: 25000 }),
      );
    });

    it('réutilise le jeton en cache pour un second appel', async () => {
      mockToken();
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ payment_url: 'u', pay_token: 'p', notif_token: 'n', status: 'INITIATED' }) });
      await gateway.initier({ reference: 'ref-1', montant: 1000, devise: 'XOF', etablissementId: 'etab-1' });

      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ payment_url: 'u2', pay_token: 'p2', notif_token: 'n2', status: 'INITIATED' }) });
      await gateway.initier({ reference: 'ref-2', montant: 2000, devise: 'XOF', etablissementId: 'etab-1' });

      // 2 appels au total pour la 1ère initiation (token + webpayment) + 1 seul pour la 2e (webpayment, jeton réutilisé).
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('rejette si ORANGE_MONEY_MERCHANT_KEY est absente', async () => {
      config.get.mockImplementation((cle: string) => (cle === 'payments.orangeMoney.merchantKey' ? undefined : valeursConfig[cle]));

      await expect(
        gateway.initier({ reference: 'ref-1', montant: 1000, devise: 'XOF', etablissementId: 'etab-1' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('verifierWebhook / extraireStatutPaiement', () => {
    it('reconfirme en direct via transactionstatus avant de faire confiance au webhook', async () => {
      mockToken();
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'SUCCESS' }) });

      const body = JSON.stringify({ order_id: 'ref-1', amount: 1000, pay_token: 'pay-tok-1' });
      await expect(gateway.verifierWebhook(body, {})).resolves.toBe(true);
      expect(fetchMock.mock.calls[1][0]).toBe('https://api.orange.com/orange-money-webpay/dev/v1/transactionstatus');
    });

    it('rejette un webhook sans les champs requis', async () => {
      await expect(gateway.verifierWebhook('{}', {})).resolves.toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('extraireStatutPaiement renvoie ECHOUE si transactionstatus ne confirme pas SUCCESS', async () => {
      mockToken();
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'FAILED' }) });

      const body = JSON.stringify({ order_id: 'ref-1', amount: 1000, pay_token: 'pay-tok-1' });
      await expect(gateway.extraireStatutPaiement(body, {})).resolves.toEqual({ reference: 'ref-1', statut: 'ECHOUE' });
    });
  });

  describe('rembourser', () => {
    it("lève NotImplementedException (pas d'endpoint documenté)", async () => {
      await expect(gateway.rembourser('pay-tok-1')).rejects.toThrow(NotImplementedException);
    });
  });
});
