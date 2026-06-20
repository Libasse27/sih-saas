import * as crypto from 'crypto';
import { SandboxPaymentGateway } from './sandbox-payment-gateway';

describe('SandboxPaymentGateway', () => {
  const secret = 'test-secret';
  let gateway: SandboxPaymentGateway;

  beforeEach(() => {
    const config = { get: jest.fn(() => secret) };
    gateway = new SandboxPaymentGateway(config as any);
  });

  function sign(body: string): string {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  it('initier() renvoie une URL de redirection contenant la référence', async () => {
    const result = await gateway.initier({
      reference: 'ref-123',
      montant: 50000,
      devise: 'XOF',
      etablissementId: 'etab-1',
    });

    expect(result.redirectUrl).toContain('ref-123');
    expect(result.providerReference).toBe('ref-123');
  });

  it('valide une signature HMAC correcte', async () => {
    const body = JSON.stringify({ reference: 'ref-123', statut: 'REUSSI' });
    await expect(gateway.verifierWebhook(body, { 'x-sandbox-signature': sign(body) })).resolves.toBe(true);
  });

  it('rejette une signature incorrecte', async () => {
    const body = JSON.stringify({ reference: 'ref-123', statut: 'REUSSI' });
    await expect(
      gateway.verifierWebhook(body, { 'x-sandbox-signature': sign('payload-different') }),
    ).resolves.toBe(false);
  });

  it('rejette une signature absente', async () => {
    const body = JSON.stringify({ reference: 'ref-123', statut: 'REUSSI' });
    await expect(gateway.verifierWebhook(body, {})).resolves.toBe(false);
  });

  it('rejette un corps modifié après signature (intégrité)', async () => {
    const original = JSON.stringify({ reference: 'ref-123', statut: 'REUSSI' });
    const signature = sign(original);
    const tampered = JSON.stringify({ reference: 'ref-123', statut: 'ECHOUE' });

    await expect(gateway.verifierWebhook(tampered, { 'x-sandbox-signature': signature })).resolves.toBe(false);
  });

  it('extraireStatutPaiement lit reference/statut depuis le corps brut', async () => {
    const body = JSON.stringify({ reference: 'ref-123', statut: 'REUSSI' });
    await expect(gateway.extraireStatutPaiement(body, {})).resolves.toEqual({
      reference: 'ref-123',
      statut: 'REUSSI',
    });
  });
});
