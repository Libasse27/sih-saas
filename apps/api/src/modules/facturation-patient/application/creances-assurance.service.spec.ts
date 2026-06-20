import { ConflictException, NotFoundException } from '@nestjs/common';
import { StatutCreanceAssurance } from '@sih-saas/shared';
import { CreancesAssuranceService } from './creances-assurance.service';

describe('CreancesAssuranceService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: CreancesAssuranceService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'creance-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    auditService = { log: jest.fn() };

    service = new CreancesAssuranceService(tenantContext as any, auditService as any);
  });

  it('creerPourFacture crée une créance A_SOUMETTRE', async () => {
    const creance = await service.creerPourFacture('facture-1', 'assurance-1', 80000);

    expect(creance.statut).toBe(StatutCreanceAssurance.A_SOUMETTRE);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ facturePatientId: 'facture-1', assuranceId: 'assurance-1', montant: 80000 }),
    );
  });

  describe('soumettre', () => {
    it('passe de A_SOUMETTRE à SOUMISE et renseigne dateSoumission', async () => {
      repository.findOne.mockResolvedValue({ id: 'c1', statut: StatutCreanceAssurance.A_SOUMETTRE });

      const creance = await service.soumettre('c1', 'admin-1');

      expect(creance.statut).toBe(StatutCreanceAssurance.SOUMISE);
      expect(creance.dateSoumission).toBeInstanceOf(Date);
    });

    it('refuse de soumettre une créance qui ne l’est pas déjà A_SOUMETTRE', async () => {
      repository.findOne.mockResolvedValue({ id: 'c1', statut: StatutCreanceAssurance.SOUMISE });
      await expect(service.soumettre('c1', 'admin-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('marquerPayee', () => {
    it('passe de SOUMISE à PAYEE avec la référence de règlement', async () => {
      repository.findOne.mockResolvedValue({ id: 'c1', statut: StatutCreanceAssurance.SOUMISE });

      const creance = await service.marquerPayee('c1', 'VIR-123', 'admin-1');

      expect(creance.statut).toBe(StatutCreanceAssurance.PAYEE);
      expect(creance.referenceReglement).toBe('VIR-123');
      expect(creance.dateReglement).toBeInstanceOf(Date);
    });

    it('refuse de marquer payée une créance non SOUMISE', async () => {
      repository.findOne.mockResolvedValue({ id: 'c1', statut: StatutCreanceAssurance.A_SOUMETTRE });
      await expect(service.marquerPayee('c1', 'VIR-123', 'admin-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('marquerRejetee', () => {
    it('passe de SOUMISE à REJETEE avec le motif', async () => {
      repository.findOne.mockResolvedValue({ id: 'c1', statut: StatutCreanceAssurance.SOUMISE });

      const creance = await service.marquerRejetee('c1', 'Police expirée', 'admin-1');

      expect(creance.statut).toBe(StatutCreanceAssurance.REJETEE);
      expect(creance.motifRejet).toBe('Police expirée');
    });
  });

  it('findById rejette une créance introuvable', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findById('inconnue')).rejects.toThrow(NotFoundException);
  });
});
