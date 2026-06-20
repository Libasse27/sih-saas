import { ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';
import { WavePaymentGateway } from './wave-payment-gateway';

describe('WavePaymentGateway', () => {
  const apiKey = 'wave_sn_test_xxx';
  const webhookSecret = 'wave-webhook-secret';
  let config: { get: jest.Mock };
  let gateway: WavePaymentGateway;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    config = {
      get: jest.fn((cle: string) => {
        const valeurs: Record<string, string> = {
          'payments.wave.apiKey': apiKey,
          'payments.wave.webhookSecret': webhookSecret,
          'payments.successUrl': 'https://sih-saas.local/paiement/succes',
          'payments.errorUrl': 'https://sih-saas.local/paiement/echec',
        };
        return valeurs[cle];
      }),
    };
    gateway = new WavePaymentGateway(config as any);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  function sign(timestamp: string, body: string): string {
    return crypto.createHmac('sha256', webhookSecret).update(`${timestamp}${body}`).digest('hex');
  }

  describe('initier', () => {
    it('crée une session de checkout et renvoie wave_launch_url', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'cos-123', wave_launch_url: 'https://pay.wave.com/cos-123', transaction_id: 'T1' }),
      });

      const result = await gateway.initier({ reference: 'ref-1', montant: 50000, devise: 'XOF', etablissementId: 'etab-1' });

      expect(result).toEqual({ redirectUrl: 'https://pay.wave.com/cos-123', providerReference: 'cos-123' });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.wave.com/v1/checkout/sessions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: `Bearer ${apiKey}` }),
        }),
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual(
        expect.objectContaining({ amount: '50000', currency: 'XOF', client_reference: 'ref-1' }),
      );
    });

    it('rejette si WAVE_API_KEY est absente', async () => {
      config.get.mockReturnValue(undefined);

      await expect(
        gateway.initier({ reference: 'ref-1', montant: 50000, devise: 'XOF', etablissementId: 'etab-1' }),
      ).rejects.toThrow(ServiceUnavailableException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("lève une erreur claire si l'API Wave répond une erreur", async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'invalid_amount' });

      await expect(
        gateway.initier({ reference: 'ref-1', montant: 50000, devise: 'XOF', etablissementId: 'etab-1' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('verifierWebhook', () => {
    it('valide une signature Wave-Signature correcte', async () => {
      const body = JSON.stringify({ data: { client_reference: 'ref-1' } });
      const timestamp = '1700000000';
      const header = `t=${timestamp},v1=${sign(timestamp, body)}`;

      await expect(gateway.verifierWebhook(body, { 'wave-signature': header })).resolves.toBe(true);
    });

    it('rejette une signature incorrecte', async () => {
      const body = JSON.stringify({ data: { client_reference: 'ref-1' } });
      await expect(
        gateway.verifierWebhook(body, { 'wave-signature': 't=1700000000,v1=deadbeef' }),
      ).resolves.toBe(false);
    });

    it("rejette l'absence du header Wave-Signature", async () => {
      await expect(gateway.verifierWebhook('{}', {})).resolves.toBe(false);
    });
  });

  describe('extraireStatutPaiement', () => {
    it('mappe checkout.session.completed/succeeded -> REUSSI', async () => {
      const body = JSON.stringify({
        type: 'checkout.session.completed',
        data: { client_reference: 'ref-1', payment_status: 'succeeded' },
      });
      await expect(gateway.extraireStatutPaiement(body, {})).resolves.toEqual({ reference: 'ref-1', statut: 'REUSSI' });
    });

    it('mappe checkout.session.payment_failed -> ECHOUE', async () => {
      const body = JSON.stringify({
        type: 'checkout.session.payment_failed',
        data: { client_reference: 'ref-1', payment_status: 'failed' },
      });
      await expect(gateway.extraireStatutPaiement(body, {})).resolves.toEqual({ reference: 'ref-1', statut: 'ECHOUE' });
    });
  });

  describe('rembourser', () => {
    it("appelle l'endpoint de remboursement avec l'id de session Wave", async () => {
      fetchMock.mockResolvedValue({ ok: true });

      await gateway.rembourser('cos-123');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.wave.com/v1/checkout/sessions/cos-123/refund',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
