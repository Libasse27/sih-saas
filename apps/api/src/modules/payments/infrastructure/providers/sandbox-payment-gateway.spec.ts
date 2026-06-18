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

  it('valide une signature HMAC correcte', () => {
    const body = JSON.stringify({ reference: 'ref-123', statut: 'REUSSI' });
    expect(gateway.verifierWebhook(body, sign(body))).toBe(true);
  });

  it('rejette une signature incorrecte', () => {
    const body = JSON.stringify({ reference: 'ref-123', statut: 'REUSSI' });
    expect(gateway.verifierWebhook(body, sign('payload-different'))).toBe(false);
  });

  it('rejette une signature absente', () => {
    const body = JSON.stringify({ reference: 'ref-123', statut: 'REUSSI' });
    expect(gateway.verifierWebhook(body, undefined)).toBe(false);
  });

  it('rejette un corps modifié après signature (intégrité)', () => {
    const original = JSON.stringify({ reference: 'ref-123', statut: 'REUSSI' });
    const signature = sign(original);
    const tampered = JSON.stringify({ reference: 'ref-123', statut: 'ECHOUE' });

    expect(gateway.verifierWebhook(tampered, signature)).toBe(false);
  });
});
