import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Periodicite, PaymentProviderType, PaymentStatut } from '@sih-saas/shared';
import { PaymentEntity } from '../infrastructure/entities/payment.entity';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let repository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let plansService: { findById: jest.Mock };
  let gateway: { type: PaymentProviderType; initier: jest.Mock; verifierWebhook: jest.Mock };
  let provisioningService: { provisionner: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: PaymentsService;

  beforeEach(() => {
    repository = { findOne: jest.fn(), create: jest.fn((e) => e), save: jest.fn((e) => e) };
    plansService = {
      findById: jest.fn().mockResolvedValue({
        id: 'plan-1',
        tarifs: { mensuel: 50000, annuel: 540000, devise: 'XOF' },
      }),
    };
    gateway = {
      type: PaymentProviderType.SANDBOX,
      initier: jest.fn().mockResolvedValue({ redirectUrl: 'https://sandbox/x', providerReference: 'ref' }),
      verifierWebhook: jest.fn().mockReturnValue(true),
    };
    provisioningService = { provisionner: jest.fn().mockResolvedValue({ id: 'sub-1' }) };
    auditService = { log: jest.fn() };

    service = new PaymentsService(
      repository as any,
      plansService as any,
      gateway as any,
      provisioningService as any,
      auditService as any,
    );
  });

  describe('initier', () => {
    it('crée un paiement EN_ATTENTE et renvoie une URL de redirection', async () => {
      const result = await service.initier({
        etablissementId: 'etab-1',
        planId: 'plan-1',
        periodicite: Periodicite.MENSUEL,
      });

      expect(result.montant).toBe(50000);
      expect(result.devise).toBe('XOF');
      expect(result.redirectUrl).toBe('https://sandbox/x');
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ statut: PaymentStatut.EN_ATTENTE, etablissementId: 'etab-1' }),
      );
    });

    it('calcule le montant annuel pour une périodicité ANNUEL', async () => {
      const result = await service.initier({
        etablissementId: 'etab-1',
        planId: 'plan-1',
        periodicite: Periodicite.ANNUEL,
      });

      expect(result.montant).toBe(540000);
    });
  });

  describe('handleWebhook', () => {
    const buildPayment = (overrides: Partial<PaymentEntity> = {}): PaymentEntity =>
      ({
        id: 'pay-1',
        etablissementId: 'etab-1',
        planId: 'plan-1',
        periodicite: Periodicite.MENSUEL,
        reference: 'ref-1',
        statut: PaymentStatut.EN_ATTENTE,
        ...overrides,
      }) as PaymentEntity;

    it('rejette une passerelle inconnue', async () => {
      await expect(
        service.handleWebhook('stripe', '{}', 'sig', { reference: 'ref-1', statut: 'REUSSI' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejette une signature invalide', async () => {
      gateway.verifierWebhook.mockReturnValue(false);

      await expect(
        service.handleWebhook('sandbox', '{}', 'sig-invalide', { reference: 'ref-1', statut: 'REUSSI' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('déclenche le provisionnement sur un paiement REUSSI', async () => {
      repository.findOne.mockResolvedValue(buildPayment());

      await service.handleWebhook('sandbox', '{"reference":"ref-1","statut":"REUSSI"}', 'sig', {
        reference: 'ref-1',
        statut: 'REUSSI',
      });

      expect(provisioningService.provisionner).toHaveBeenCalledWith('etab-1', 'plan-1', Periodicite.MENSUEL);
      expect(repository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ subscriptionId: 'sub-1' }),
      );
    });

    it('ne déclenche pas le provisionnement sur un paiement ECHOUE', async () => {
      repository.findOne.mockResolvedValue(buildPayment());

      await service.handleWebhook('sandbox', '{"reference":"ref-1","statut":"ECHOUE"}', 'sig', {
        reference: 'ref-1',
        statut: 'ECHOUE',
      });

      expect(provisioningService.provisionner).not.toHaveBeenCalled();
    });

    it('ignore un webhook déjà traité (idempotence)', async () => {
      repository.findOne.mockResolvedValue(buildPayment({ statut: PaymentStatut.REUSSI }));

      await service.handleWebhook('sandbox', '{"reference":"ref-1","statut":"REUSSI"}', 'sig', {
        reference: 'ref-1',
        statut: 'REUSSI',
      });

      expect(provisioningService.provisionner).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejette un paiement introuvable', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.handleWebhook('sandbox', '{}', 'sig', { reference: 'inconnue', statut: 'REUSSI' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
