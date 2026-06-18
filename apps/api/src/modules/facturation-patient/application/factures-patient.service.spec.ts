import { ConflictException } from '@nestjs/common';
import { FacturePatientStatut } from '@sih-saas/shared';
import { FacturesPatientService } from './factures-patient.service';

describe('FacturesPatientService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let etablissementsService: { findById: jest.Mock; incrementerCompteur: jest.Mock };
  let assurancesService: { findActivePourPatient: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: FacturesPatientService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'facture-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    etablissementsService = {
      findById: jest.fn().mockResolvedValue({ id: 'etab-1', code: 'HMS' }),
      incrementerCompteur: jest.fn().mockResolvedValue(45),
    };
    assurancesService = { findActivePourPatient: jest.fn().mockResolvedValue(null) };
    auditService = { log: jest.fn() };

    service = new FacturesPatientService(
      tenantContext as any,
      etablissementsService as any,
      assurancesService as any,
      auditService as any,
    );
  });

  const dto = { lignes: [{ libelle: 'Consultation', quantite: 1, prixUnitaire: 15000 }] };

  it('sans assurance active : part_patient = montant_total, part_assurance = 0', async () => {
    const facture = await service.create('patient-1', dto, 'caissier-1');

    expect(facture.montantTotal).toBe(15000);
    expect(facture.partAssurance).toBe(0);
    expect(facture.partPatient).toBe(15000);
    expect(facture.numero).toBe('HMS-FACT-' + new Date().getFullYear() + '-000045');
  });

  it('avec assurance active à 80% : part_assurance = 80%, part_patient = reste à charge', async () => {
    assurancesService.findActivePourPatient.mockResolvedValue({ tauxCouverture: 80 });

    const facture = await service.create(
      'patient-1',
      { lignes: [{ libelle: 'Hospitalisation', quantite: 1, prixUnitaire: 100000 }] },
      'caissier-1',
    );

    expect(facture.partAssurance).toBe(80000);
    expect(facture.partPatient).toBe(20000);
  });

  it('annuler() refuse si la facture est déjà PAYEE', async () => {
    repository.findOne.mockResolvedValue({ id: 'f1', statut: FacturePatientStatut.PAYEE });
    await expect(service.annuler('f1', 'caissier-1')).rejects.toThrow(ConflictException);
  });

  describe('appliquerPaiement (statut agrégé)', () => {
    it('reste EN_ATTENTE si rien n’a été payé', async () => {
      repository.findOne.mockResolvedValue({ id: 'f1', partPatient: 20000, statut: FacturePatientStatut.EN_ATTENTE });
      const facture = await service.appliquerPaiement('f1', 0);
      expect(facture.statut).toBe(FacturePatientStatut.EN_ATTENTE);
    });

    it('passe PARTIELLEMENT_PAYEE si la somme payée est positive mais incomplète', async () => {
      repository.findOne.mockResolvedValue({ id: 'f1', partPatient: 20000, statut: FacturePatientStatut.EN_ATTENTE });
      const facture = await service.appliquerPaiement('f1', 10000);
      expect(facture.statut).toBe(FacturePatientStatut.PARTIELLEMENT_PAYEE);
    });

    it('passe PAYEE si la somme payée couvre le reste à charge', async () => {
      repository.findOne.mockResolvedValue({ id: 'f1', partPatient: 20000, statut: FacturePatientStatut.PARTIELLEMENT_PAYEE });
      const facture = await service.appliquerPaiement('f1', 20000);
      expect(facture.statut).toBe(FacturePatientStatut.PAYEE);
    });

    it('refuse de toucher une facture ANNULEE', async () => {
      repository.findOne.mockResolvedValue({ id: 'f1', partPatient: 20000, statut: FacturePatientStatut.ANNULEE });
      await expect(service.appliquerPaiement('f1', 20000)).rejects.toThrow(ConflictException);
    });
  });
});
