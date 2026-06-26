import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { FacturePatientStatut, ModePaiementPatient, PaymentProviderType, PaymentStatut } from '@sih-saas/shared';
import { PaiementsPatientService } from './paiements-patient.service';

describe('PaiementsPatientService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; find: jest.Mock; update: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let facturesPatientService: { findById: jest.Mock; appliquerPaiement: jest.Mock };
  let gateway: { initier: jest.Mock; verifierWebhook: jest.Mock; extraireStatutPaiement: jest.Mock };
  let registry: { get: jest.Mock };
  let auditService: { log: jest.Mock };
  let comptabiliteService: { genererEcritureEncaissement: jest.Mock };
  let service: PaiementsPatientService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'paiement-1', ...entity })),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    facturesPatientService = {
      findById: jest.fn().mockResolvedValue({ id: 'facture-1', statut: FacturePatientStatut.EN_ATTENTE, partPatient: 20000 }),
      appliquerPaiement: jest.fn().mockResolvedValue(undefined),
    };
    gateway = {
      initier: jest.fn().mockResolvedValue({ redirectUrl: 'https://sandbox/checkout/x', providerReference: 'x' }),
      verifierWebhook: jest.fn().mockResolvedValue(true),
      extraireStatutPaiement: jest.fn().mockResolvedValue({ reference: 'x', statut: 'REUSSI' }),
    };
    registry = { get: jest.fn().mockReturnValue(gateway) };
    auditService = { log: jest.fn() };
    comptabiliteService = { genererEcritureEncaissement: jest.fn().mockResolvedValue(undefined) };

    service = new PaiementsPatientService(tenantContext as any, facturesPatientService as any, registry as any, auditService as any, comptabiliteService as any);
  });

  describe('create', () => {
    it('refuse un paiement sur une facture annulée', async () => {
      facturesPatientService.findById.mockResolvedValue({ id: 'f1', statut: FacturePatientStatut.ANNULEE });
      await expect(
        service.create('f1', { montant: 1000, mode: ModePaiementPatient.CAISSE }, 'caissier-1', 'caissier-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('refuse CAISSE sans caissier identifié (paiement patient)', async () => {
      await expect(
        service.create('facture-1', { montant: 1000, mode: ModePaiementPatient.CAISSE }, null, 'patient-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('CAISSE avec caissier : statut REUSSI immédiat, recalcule la facture', async () => {
      repository.find.mockResolvedValue([{ montant: 20000 }]);

      const { paiement, redirectUrl } = await service.create(
        'facture-1',
        { montant: 20000, mode: ModePaiementPatient.CAISSE },
        'caissier-1',
        'caissier-1',
      );

      expect(paiement.statut).toBe(PaymentStatut.REUSSI);
      expect(redirectUrl).toBeUndefined();
      expect(registry.get).not.toHaveBeenCalled();
      expect(facturesPatientService.appliquerPaiement).toHaveBeenCalledWith('facture-1', 20000);
    });

    it('ORANGE_MONEY : résout la passerelle Orange Money via le registre, statut EN_ATTENTE', async () => {
      const { paiement, redirectUrl } = await service.create(
        'facture-1',
        { montant: 20000, mode: ModePaiementPatient.ORANGE_MONEY },
        null,
        'patient-1',
      );

      expect(registry.get).toHaveBeenCalledWith(PaymentProviderType.ORANGE_MONEY);
      expect(paiement.statut).toBe(PaymentStatut.EN_ATTENTE);
      expect(redirectUrl).toBe('https://sandbox/checkout/x');
      expect(repository.update).toHaveBeenCalledWith({ reference: expect.any(String) }, { providerReference: 'x' });
      expect(facturesPatientService.appliquerPaiement).not.toHaveBeenCalled();
    });

    it('WAVE : résout la passerelle Wave via le registre', async () => {
      await service.create('facture-1', { montant: 20000, mode: ModePaiementPatient.WAVE }, null, 'patient-1');
      expect(registry.get).toHaveBeenCalledWith(PaymentProviderType.WAVE);
    });
  });

  describe('handleWebhook', () => {
    it('rejette une passerelle inconnue', async () => {
      await expect(service.handleWebhook('stripe', '{}', {})).rejects.toThrow(NotFoundException);
    });

    it('rejette une signature invalide', async () => {
      gateway.verifierWebhook.mockResolvedValue(false);
      await expect(service.handleWebhook('sandbox', '{}', { 'x-sandbox-signature': 'mauvaise-signature' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('idempotent : ignore un paiement déjà traité (pas EN_ATTENTE)', async () => {
      repository.findOne.mockResolvedValue({ id: 'p1', statut: PaymentStatut.REUSSI, facturePatientId: 'facture-1' });

      await service.handleWebhook('sandbox', '{}', {});

      expect(repository.save).not.toHaveBeenCalled();
      expect(facturesPatientService.appliquerPaiement).not.toHaveBeenCalled();
    });

    it('REUSSI : met à jour le paiement et recalcule la facture', async () => {
      repository.findOne.mockResolvedValue({ id: 'p1', statut: PaymentStatut.EN_ATTENTE, facturePatientId: 'facture-1', etablissementId: 'etab-1' });
      repository.find.mockResolvedValue([{ montant: 20000 }]);

      await service.handleWebhook('sandbox', '{}', {});

      expect(facturesPatientService.appliquerPaiement).toHaveBeenCalledWith('facture-1', 20000);
    });
  });
});
