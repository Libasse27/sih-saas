import { CompteType, JournalCode, ModePaiementPatient, PaymentStatut } from '@sih-saas/shared';
import { ComptabiliteService } from './comptabilite.service';
import type { PaiementPatientEntity } from '../../facturation-patient/infrastructure/entities/paiement-patient.entity';

describe('ComptabiliteService', () => {
  let service: ComptabiliteService;
  let tenantContext: { getManager: jest.Mock };

  function makeQb(result: unknown) {
    return {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(result),
    };
  }

  function makeRepo(overrides: Partial<{ findOne: jest.Mock; find: jest.Mock; count: jest.Mock; save: jest.Mock; create: jest.Mock; createQueryBuilder: jest.Mock }> = {}) {
    return {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'uuid-test', ...e })),
      create: jest.fn().mockImplementation((d) => d),
      createQueryBuilder: jest.fn(() => makeQb([])),
      ...overrides,
    };
  }

  beforeEach(() => {
    const repo = makeRepo();
    const mgr = { getRepository: jest.fn(() => repo) };
    tenantContext = { getManager: jest.fn().mockReturnValue(mgr) };
    service = new ComptabiliteService(tenantContext as any);
  });

  it('ensureCompte: retourne le compte existant sans en créer un nouveau', async () => {
    const existing = { id: 'c1', code: '571', libelle: 'Caisse', classe: 5, type: CompteType.TRESORERIE };
    const mgr = tenantContext.getManager();
    mgr.getRepository.mockReturnValue(makeRepo({ findOne: jest.fn().mockResolvedValue(existing) }));
    const result = await service.ensureCompte('571', 'Caisse', 5, CompteType.TRESORERIE);
    expect(result).toBe(existing);
  });

  it('ensureCompte: crée le compte si absent', async () => {
    const repo = makeRepo({ findOne: jest.fn().mockResolvedValue(null) });
    const mgr = tenantContext.getManager();
    mgr.getRepository.mockReturnValue(repo);
    await service.ensureCompte('571', 'Caisse', 5, CompteType.TRESORERIE);
    expect(repo.save).toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ code: '571' }));
  });

  it('genererEcritureEncaissement: utilise compte 571 et journal CAI pour mode CAISSE', async () => {
    const repo = makeRepo({ findOne: jest.fn().mockResolvedValue(null) });
    const mgr = tenantContext.getManager();
    mgr.getRepository.mockReturnValue(repo);

    const paiement = {
      id: 'p1',
      reference: 'ref-001',
      montant: 25000,
      mode: ModePaiementPatient.CAISSE,
      statut: PaymentStatut.REUSSI,
      date: new Date('2026-06-26'),
      caissierId: 'u1',
    } as unknown as PaiementPatientEntity;

    await service.genererEcritureEncaissement(paiement);

    const createCall = repo.create.mock.calls.find((args: unknown[]) => {
      const arg = args[0] as Record<string, unknown>;
      return arg && 'journalCode' in arg;
    });
    expect(createCall).toBeDefined();
    const ecriture = createCall[0] as Record<string, unknown>;
    expect(ecriture.journalCode).toBe(JournalCode.CAISSE);
    expect(ecriture.compteDebitCode).toBe('571');
    expect(ecriture.compteCreditCode).toBe('411');
    expect(ecriture.pieceRef).toBe('ref-001');
  });

  it('genererEcritureEncaissement: utilise compte 521 et journal BQE pour Orange Money', async () => {
    const repo = makeRepo({ findOne: jest.fn().mockResolvedValue(null) });
    const mgr = tenantContext.getManager();
    mgr.getRepository.mockReturnValue(repo);

    const paiement = {
      id: 'p2',
      reference: 'ref-002',
      montant: 15000,
      mode: ModePaiementPatient.ORANGE_MONEY,
      statut: PaymentStatut.REUSSI,
      date: new Date('2026-06-26'),
      caissierId: null,
    } as unknown as PaiementPatientEntity;

    await service.genererEcritureEncaissement(paiement);

    const createCall = repo.create.mock.calls.find((args: unknown[]) => {
      const arg = args[0] as Record<string, unknown>;
      return arg && 'journalCode' in arg;
    });
    const ecriture = createCall[0] as Record<string, unknown>;
    expect(ecriture.journalCode).toBe(JournalCode.BANQUE);
    expect(ecriture.compteDebitCode).toBe('521');
  });

  it('genererEcritureEncaissement: idempotent — ne recrée pas si pieceRef déjà présente', async () => {
    const repo = makeRepo({
      findOne: jest.fn().mockResolvedValue({ id: 'existing' }),
    });
    const mgr = tenantContext.getManager();
    mgr.getRepository.mockReturnValue(repo);

    const paiement = {
      reference: 'ref-deja-presente',
      montant: 1000,
      mode: ModePaiementPatient.CAISSE,
      date: new Date(),
      caissierId: null,
    } as unknown as PaiementPatientEntity;

    await service.genererEcritureEncaissement(paiement);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('getBalance: solde positif pour compte TRESORERIE (solde normal débit)', async () => {
    const comptes = [{ code: '571', libelle: 'Caisse', classe: 5, type: CompteType.TRESORERIE }];
    const debitQb = { ...makeQb([{ code: '571', total: '50000' }]) };
    const creditQb = { ...makeQb([]) };
    let qbCallCount = 0;

    const repo = {
      ...makeRepo(),
      find: jest.fn().mockResolvedValue(comptes),
      createQueryBuilder: jest.fn(() => {
        qbCallCount++;
        return qbCallCount === 1 ? debitQb : creditQb;
      }),
    };
    const mgr = { getRepository: jest.fn(() => repo) };
    tenantContext.getManager.mockReturnValue(mgr);

    const balance = await service.getBalance();
    expect(balance[0].totalDebit).toBe(50000);
    expect(balance[0].totalCredit).toBe(0);
    expect(balance[0].solde).toBe(50000);
  });

  it('getBalance: solde positif pour compte PRODUIT (solde normal crédit)', async () => {
    const comptes = [{ code: '706', libelle: 'Prestations', classe: 7, type: CompteType.PRODUIT }];
    const debitQb = { ...makeQb([]) };
    const creditQb = { ...makeQb([{ code: '706', total: '120000' }]) };
    let qbCallCount = 0;

    const repo = {
      ...makeRepo(),
      find: jest.fn().mockResolvedValue(comptes),
      createQueryBuilder: jest.fn(() => {
        qbCallCount++;
        return qbCallCount === 1 ? debitQb : creditQb;
      }),
    };
    const mgr = { getRepository: jest.fn(() => repo) };
    tenantContext.getManager.mockReturnValue(mgr);

    const balance = await service.getBalance();
    expect(balance[0].solde).toBe(120000);
  });
});
