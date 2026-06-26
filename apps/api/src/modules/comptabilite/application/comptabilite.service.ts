import { Injectable } from '@nestjs/common';
import { CompteType, JournalCode, ModePaiementPatient } from '@sih-saas/shared';
import { Between, FindOptionsWhere } from 'typeorm';
import { PaiementPatientEntity } from '../../facturation-patient/infrastructure/entities/paiement-patient.entity';
import { CompteComptableEntity } from '../infrastructure/entities/compte-comptable.entity';
import { EcritureComptableEntity } from '../infrastructure/entities/ecriture-comptable.entity';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';

export interface BalanceLigne {
  code: string;
  libelle: string;
  classe: number;
  type: CompteType;
  totalDebit: number;
  totalCredit: number;
  solde: number;
}

const COMPTES_STANDARD: Record<string, { libelle: string; classe: number; type: CompteType }> = {
  '411': { libelle: 'Clients', classe: 4, type: CompteType.ACTIF },
  '521': { libelle: 'Banque (Mobile Money)', classe: 5, type: CompteType.TRESORERIE },
  '571': { libelle: 'Caisse', classe: 5, type: CompteType.TRESORERIE },
  '706': { libelle: 'Prestations de services', classe: 7, type: CompteType.PRODUIT },
};

@Injectable()
export class ComptabiliteService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get repoCompte() {
    return this.tenantContext.getManager().getRepository(CompteComptableEntity);
  }

  private get repoEcriture() {
    return this.tenantContext.getManager().getRepository(EcritureComptableEntity);
  }

  async ensureCompte(code: string, libelle: string, classe: number, type: CompteType): Promise<CompteComptableEntity> {
    const existing = await this.repoCompte.findOne({ where: { code } });
    if (existing) return existing;
    return this.repoCompte.save(this.repoCompte.create({ code, libelle, classe, type }));
  }

  private async genererNumero(journalCode: JournalCode): Promise<string> {
    const annee = new Date().getFullYear();
    const count = await this.repoEcriture.count({
      where: {
        journalCode,
        date: Between(`${annee}-01-01`, `${annee}-12-31`),
      },
    });
    return `${journalCode}-${annee}-${String(count + 1).padStart(4, '0')}`;
  }

  async genererEcritureEncaissement(paiement: PaiementPatientEntity): Promise<void> {
    const existante = await this.repoEcriture.findOne({ where: { pieceRef: paiement.reference } });
    if (existante) return;

    const estCaisse = paiement.mode === ModePaiementPatient.CAISSE;
    const journalCode = estCaisse ? JournalCode.CAISSE : JournalCode.BANQUE;
    const compteDebitCode = estCaisse ? '571' : '521';

    const standard = COMPTES_STANDARD[compteDebitCode];
    await Promise.all([
      this.ensureCompte(compteDebitCode, standard.libelle, standard.classe, standard.type),
      this.ensureCompte('411', COMPTES_STANDARD['411'].libelle, COMPTES_STANDARD['411'].classe, COMPTES_STANDARD['411'].type),
    ]);

    const numero = await this.genererNumero(journalCode);
    const dateStr = paiement.date.toISOString().split('T')[0];

    await this.repoEcriture.save(
      this.repoEcriture.create({
        date: dateStr,
        journalCode,
        numero,
        libelle: `Encaissement paiement patient`,
        compteDebitCode,
        montantDebit: paiement.montant,
        compteCreditCode: '411',
        montantCredit: paiement.montant,
        pieceRef: paiement.reference,
        saisieParId: paiement.caissierId ?? null,
      }),
    );
  }

  async creerEcritureOD(
    dto: {
      date: string;
      libelle: string;
      compteDebitCode: string;
      montantDebit: number;
      compteCreditCode: string;
      montantCredit: number;
    },
    userId: string | null,
  ): Promise<EcritureComptableEntity> {
    const numero = await this.genererNumero(JournalCode.OD);
    return this.repoEcriture.save(
      this.repoEcriture.create({
        ...dto,
        journalCode: JournalCode.OD,
        numero,
        saisieParId: userId,
        pieceRef: null,
      }),
    );
  }

  async getJournal(filters: {
    dateDebut?: string;
    dateFin?: string;
    journalCode?: JournalCode;
  }): Promise<EcritureComptableEntity[]> {
    const where: FindOptionsWhere<EcritureComptableEntity> = {};
    if (filters.journalCode) where.journalCode = filters.journalCode;
    if (filters.dateDebut && filters.dateFin) {
      where.date = Between(filters.dateDebut, filters.dateFin);
    } else if (filters.dateDebut) {
      where.date = Between(filters.dateDebut, '9999-12-31');
    } else if (filters.dateFin) {
      where.date = Between('0001-01-01', filters.dateFin);
    }
    return this.repoEcriture.find({ where, order: { date: 'DESC', numero: 'DESC' } });
  }

  async getBalance(): Promise<BalanceLigne[]> {
    const mgr = this.tenantContext.getManager();

    const [debitRows, creditRows, comptes] = await Promise.all([
      mgr
        .getRepository(EcritureComptableEntity)
        .createQueryBuilder('e')
        .select('e.compteDebitCode', 'code')
        .addSelect('COALESCE(SUM(e.montantDebit), 0)', 'total')
        .groupBy('e.compteDebitCode')
        .getRawMany<{ code: string; total: string }>(),

      mgr
        .getRepository(EcritureComptableEntity)
        .createQueryBuilder('e')
        .select('e.compteCreditCode', 'code')
        .addSelect('COALESCE(SUM(e.montantCredit), 0)', 'total')
        .groupBy('e.compteCreditCode')
        .getRawMany<{ code: string; total: string }>(),

      mgr.getRepository(CompteComptableEntity).find({ order: { code: 'ASC' } }),
    ]);

    const debitMap = new Map(debitRows.map((r) => [r.code, parseFloat(r.total)]));
    const creditMap = new Map(creditRows.map((r) => [r.code, parseFloat(r.total)]));
    const SOLDE_NORMAL_DEBIT = new Set([CompteType.ACTIF, CompteType.CHARGE, CompteType.TRESORERIE]);

    return comptes.map((c) => {
      const totalDebit = debitMap.get(c.code) ?? 0;
      const totalCredit = creditMap.get(c.code) ?? 0;
      const solde = SOLDE_NORMAL_DEBIT.has(c.type) ? totalDebit - totalCredit : totalCredit - totalDebit;
      return { code: c.code, libelle: c.libelle, classe: c.classe, type: c.type, totalDebit, totalCredit, solde };
    });
  }
}
