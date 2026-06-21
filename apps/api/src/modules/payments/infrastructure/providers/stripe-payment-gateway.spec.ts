import { ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';
import { StripePaymentGateway } from './stripe-payment-gateway';

describe('StripePaymentGateway', () => {
  const secretKey = 'sk_test_xxx';
  const webhookSecret = 'whsec_test_xxx';
  let config: { get: jest.Mock };
  let gateway: StripePaymentGateway;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    config = {
      get: jest.fn((cle: string) => {
        const valeurs: Record<string, string> = {
          'payments.stripe.secretKey': secretKey,
          'payments.stripe.webhookSecret': webhookSecret,
          'payments.successUrl': 'https://sih-saas.local/paiement/succes',
          'payments.errorUrl': 'https://sih-saas.local/paiement/echec',
        };
        return valeurs[cle];
      }),
    };
    gateway = new StripePaymentGateway(config as any);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  function sign(timestamp: string, body: string): string {
    return crypto.createHmac('sha256', webhookSecret).update(`${timestamp}.${body}`).digest('hex');
  }

  describe('initier', () => {
    it('crée une checkout session form-encoded et renvoie son url', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'cs_test_123', url: 'https://checkout.stripe.com/c/pay/cs_test_123' }),
      });

      const result = await gateway.initier({ reference: 'ref-1', montant: 50000, devise: 'XOF', etablissementId: 'etab-1' });

      expect(result).toEqual({ redirectUrl: 'https://checkout.stripe.com/c/pay/cs_test_123', providerReference: 'cs_test_123' });
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.stripe.com/v1/checkout/sessions');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(options.headers.Authorization).toBe(`Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`);

      const body = new URLSearchParams(options.body as string);
      expect(body.get('mode')).toBe('payment');
      expect(body.get('client_reference_id')).toBe('ref-1');
      expect(body.get('line_items[0][price_data][unit_amount]')).toBe('50000');
      expect(body.get('line_items[0][price_data][currency]')).toBe('xof');
    });

    it('rejette si STRIPE_SECRET_KEY est absente', async () => {
      config.get.mockReturnValue(undefined);

      await expect(
        gateway.initier({ reference: 'ref-1', montant: 50000, devise: 'XOF', etablissementId: 'etab-1' }),
      ).rejects.toThrow(ServiceUnavailableException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("lève une erreur claire si l'API Stripe répond une erreur", async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'invalid_request' });

      await expect(
        gateway.initier({ reference: 'ref-1', montant: 50000, devise: 'XOF', etablissementId: 'etab-1' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('verifierWebhook', () => {
    it('valide une signature Stripe-Signature correcte et récente', async () => {
      const body = JSON.stringify({ data: { object: { client_reference_id: 'ref-1' } } });
      const timestamp = String(Math.floor(Date.now() / 1000));
      const header = `t=${timestamp},v1=${sign(timestamp, body)}`;

      await expect(gateway.verifierWebhook(body, { 'stripe-signature': header })).resolves.toBe(true);
    });

    it('rejette une signature incorrecte', async () => {
      const body = JSON.stringify({ data: { object: { client_reference_id: 'ref-1' } } });
      const timestamp = String(Math.floor(Date.now() / 1000));

      await expect(
        gateway.verifierWebhook(body, { 'stripe-signature': `t=${timestamp},v1=deadbeef` }),
      ).resolves.toBe(false);
    });

    it('rejette un timestamp trop ancien (anti-replay)', async () => {
      const body = JSON.stringify({ data: { object: { client_reference_id: 'ref-1' } } });
      const timestampAncien = String(Math.floor(Date.now() / 1000) - 600);
      const header = `t=${timestampAncien},v1=${sign(timestampAncien, body)}`;

      await expect(gateway.verifierWebhook(body, { 'stripe-signature': header })).resolves.toBe(false);
    });

    it("rejette l'absence du header Stripe-Signature", async () => {
      await expect(gateway.verifierWebhook('{}', {})).resolves.toBe(false);
    });
  });

  describe('extraireStatutPaiement', () => {
    it('mappe checkout.session.completed + payment_status=paid -> REUSSI', async () => {
      const body = JSON.stringify({
        type: 'checkout.session.completed',
        data: { object: { client_reference_id: 'ref-1', payment_status: 'paid' } },
      });
      await expect(gateway.extraireStatutPaiement(body, {})).resolves.toEqual({ reference: 'ref-1', statut: 'REUSSI' });
    });

    it('mappe checkout.session.async_payment_failed -> ECHOUE', async () => {
      const body = JSON.stringify({
        type: 'checkout.session.async_payment_failed',
        data: { object: { client_reference_id: 'ref-1', payment_status: 'unpaid' } },
      });
      await expect(gateway.extraireStatutPaiement(body, {})).resolves.toEqual({ reference: 'ref-1', statut: 'ECHOUE' });
    });
  });

  describe('rembourser', () => {
    it("récupère le payment_intent de la session puis crée le remboursement", async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ payment_intent: 'pi_123' }) })
        .mockResolvedValueOnce({ ok: true });

      await gateway.rembourser('cs_test_123', 10000);

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://api.stripe.com/v1/checkout/sessions/cs_test_123',
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringContaining('Basic') }) }),
      );
      const [refundUrl, refundOptions] = fetchMock.mock.calls[1];
      expect(refundUrl).toBe('https://api.stripe.com/v1/refunds');
      const refundBody = new URLSearchParams(refundOptions.body as string);
      expect(refundBody.get('payment_intent')).toBe('pi_123');
      expect(refundBody.get('amount')).toBe('10000');
    });

    it("rejette si la session n'a pas de payment_intent (jamais payée)", async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ payment_intent: null }) });

      await expect(gateway.rembourser('cs_test_123')).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
