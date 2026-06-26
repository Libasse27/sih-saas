import { Injectable } from '@nestjs/common';
import {
  AdmissionStatut,
  CongeStatut,
  DemandeStatut,
  EmployeStatut,
  FacturePatientStatut,
  InterventionStatut,
  LitStatut,
  NiveauTriage,
  PrescriptionStatut,
  SalleOperationStatut,
  UrgenceStatut,
} from '@sih-saas/shared';
import { In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AdmissionEntity } from '../../admissions-lits/infrastructure/entities/admission.entity';
import { LitEntity } from '../../admissions-lits/infrastructure/entities/lit.entity';
import { InterventionEntity } from '../../bloc-operatoire/infrastructure/entities/intervention.entity';
import { SalleOperationEntity } from '../../bloc-operatoire/infrastructure/entities/salle-operation.entity';
import { FacturePatientEntity } from '../../facturation-patient/infrastructure/entities/facture-patient.entity';
import { DemandeImagerieEntity } from '../../imagerie/infrastructure/entities/demande-imagerie.entity';
import { DemandeAnalyseEntity } from '../../laboratoire/infrastructure/entities/demande-analyse.entity';
import { StockMedicamentEntity } from '../../pharmacie/infrastructure/entities/stock-medicament.entity';
import { PrescriptionEntity } from '../../prescriptions/infrastructure/entities/prescription.entity';
import { CongeEntity } from '../../rh/infrastructure/entities/conge.entity';
import { EmployeEntity } from '../../rh/infrastructure/entities/employe.entity';
import { UrgenceEntity } from '../../urgences/infrastructure/entities/urgence.entity';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';

export interface DashboardStats {
  lits: {
    parStatut: Record<LitStatut, number>;
    tauxOccupation: number;
    admissionsEnCours: number;
  };
  urgences: {
    actifs: number;
    parNiveau: Record<NiveauTriage, number>;
    cloturesToday: number;
  };
  bloc: {
    interventionsAujourdhuiParStatut: Record<InterventionStatut, number>;
    sallesParStatut: Record<SalleOperationStatut, number>;
  };
  labo: {
    parStatut: Record<DemandeStatut, number>;
  };
  imagerie: {
    parStatut: Record<DemandeStatut, number>;
  };
  pharmacie: {
    stocksSousSeuilAlerte: number;
    prescriptionsEnAttente: number;
  };
  rh: {
    employesActifs: number;
    congesEnCours: number;
  };
  facturation: {
    recettesDuMois: number;
    facturesEnAttente: number;
    devise: string;
  };
}

@Injectable()
export class DashboardEtablissementService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async getStats(): Promise<DashboardStats> {
    const mgr = this.tenantContext.getManager();
    const today = new Date();
    const debutJour = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const finJour = new Date(debutJour.getTime() + 24 * 60 * 60 * 1000);
    const debutMois = new Date(today.getFullYear(), today.getMonth(), 1);
    const todayStr = debutJour.toISOString().split('T')[0];

    const [
      litsRaw,
      admissionsEnCours,
      urgencesActives,
      urgencesParNiveauRaw,
      urgencesClotureesTodayRaw,
      interventionsBlocRaw,
      sallesRaw,
      laboRaw,
      imagerieRaw,
      stocksSousSeuilAlerte,
      prescriptionsEnAttente,
      employesActifs,
      congesEnCours,
      recettesMois,
      facturesEnAttente,
    ] = await Promise.all([
      // Lits par statut
      mgr
        .getRepository(LitEntity)
        .createQueryBuilder('l')
        .select('l.statut', 'statut')
        .addSelect('COUNT(*)', 'total')
        .groupBy('l.statut')
        .getRawMany<{ statut: LitStatut; total: string }>(),

      // Admissions en cours
      mgr.getRepository(AdmissionEntity).count({ where: { statut: AdmissionStatut.EN_COURS } }),

      // Urgences actives
      mgr.getRepository(UrgenceEntity).count({
        where: { statut: In([UrgenceStatut.EN_ATTENTE, UrgenceStatut.EN_COURS]) },
      }),

      // Urgences actives par niveau de triage
      mgr
        .getRepository(UrgenceEntity)
        .createQueryBuilder('u')
        .select('u.niveauTriage', 'niveau')
        .addSelect('COUNT(*)', 'total')
        .where('u.statut IN (:...statuts)', { statuts: [UrgenceStatut.EN_ATTENTE, UrgenceStatut.EN_COURS] })
        .groupBy('u.niveauTriage')
        .getRawMany<{ niveau: NiveauTriage; total: string }>(),

      // Urgences clôturées aujourd'hui
      mgr.getRepository(UrgenceEntity).count({
        where: {
          statut: In([UrgenceStatut.TRANSFEREE, UrgenceStatut.SORTIE, UrgenceStatut.DECES]),
          updatedAt: MoreThanOrEqual(debutJour),
        },
      }),

      // Interventions bloc aujourd'hui par statut
      mgr
        .getRepository(InterventionEntity)
        .createQueryBuilder('i')
        .select('i.statut', 'statut')
        .addSelect('COUNT(*)', 'total')
        .where('i.dateHeurePrevue >= :debut', { debut: debutJour })
        .andWhere('i.dateHeurePrevue < :fin', { fin: finJour })
        .groupBy('i.statut')
        .getRawMany<{ statut: InterventionStatut; total: string }>(),

      // Salles d'opération par statut
      mgr
        .getRepository(SalleOperationEntity)
        .createQueryBuilder('s')
        .select('s.statut', 'statut')
        .addSelect('COUNT(*)', 'total')
        .groupBy('s.statut')
        .getRawMany<{ statut: SalleOperationStatut; total: string }>(),

      // Demandes analyse par statut (hors ANNULEE)
      mgr
        .getRepository(DemandeAnalyseEntity)
        .createQueryBuilder('d')
        .select('d.statut', 'statut')
        .addSelect('COUNT(*)', 'total')
        .where('d.statut != :annulee', { annulee: DemandeStatut.ANNULEE })
        .groupBy('d.statut')
        .getRawMany<{ statut: DemandeStatut; total: string }>(),

      // Demandes imagerie par statut (hors ANNULEE)
      mgr
        .getRepository(DemandeImagerieEntity)
        .createQueryBuilder('d')
        .select('d.statut', 'statut')
        .addSelect('COUNT(*)', 'total')
        .where('d.statut != :annulee', { annulee: DemandeStatut.ANNULEE })
        .groupBy('d.statut')
        .getRawMany<{ statut: DemandeStatut; total: string }>(),

      // Stocks sous le seuil d'alerte (quantite <= seuilAlerte)
      mgr
        .getRepository(StockMedicamentEntity)
        .createQueryBuilder('s')
        .where('s.quantite <= s.seuilAlerte')
        .getCount(),

      // Prescriptions en attente de validation
      mgr.getRepository(PrescriptionEntity).count({ where: { statut: PrescriptionStatut.EN_ATTENTE } }),

      // Employés actifs
      mgr.getRepository(EmployeEntity).count({ where: { statut: EmployeStatut.ACTIF } }),

      // Congés en cours (APPROUVE et periode couvrant aujourd'hui)
      mgr.getRepository(CongeEntity).count({
        where: {
          statut: CongeStatut.APPROUVE,
          dateDebut: LessThanOrEqual(todayStr),
          dateFin: MoreThanOrEqual(todayStr),
        },
      }),

      // Recettes du mois (somme des factures PAYEE depuis le 1er du mois)
      mgr
        .getRepository(FacturePatientEntity)
        .createQueryBuilder('f')
        .select('COALESCE(SUM(f.montantTotal), 0)', 'total')
        .where('f.statut = :statut', { statut: FacturePatientStatut.PAYEE })
        .andWhere('f.createdAt >= :debut', { debut: debutMois })
        .getRawOne<{ total: string }>(),

      // Factures en attente
      mgr.getRepository(FacturePatientEntity).count({ where: { statut: FacturePatientStatut.EN_ATTENTE } }),
    ]);

    // --- Lits ---
    const litsParStatut = Object.fromEntries(
      Object.values(LitStatut).map((s) => [s, 0]),
    ) as Record<LitStatut, number>;
    for (const row of litsRaw) {
      litsParStatut[row.statut] = parseInt(row.total, 10);
    }
    const totalLits = Object.values(litsParStatut).reduce((a, b) => a + b, 0);
    const tauxOccupation = totalLits > 0 ? Math.round((litsParStatut[LitStatut.OCCUPE] / totalLits) * 100) : 0;

    // --- Urgences par niveau ---
    const parNiveau = Object.fromEntries(
      Object.values(NiveauTriage).map((n) => [n, 0]),
    ) as Record<NiveauTriage, number>;
    for (const row of urgencesParNiveauRaw) {
      parNiveau[row.niveau] = parseInt(row.total, 10);
    }

    // --- Bloc par statut ---
    const interventionsAujourdhuiParStatut = Object.fromEntries(
      Object.values(InterventionStatut).map((s) => [s, 0]),
    ) as Record<InterventionStatut, number>;
    for (const row of interventionsBlocRaw) {
      interventionsAujourdhuiParStatut[row.statut] = parseInt(row.total, 10);
    }
    const sallesParStatut = Object.fromEntries(
      Object.values(SalleOperationStatut).map((s) => [s, 0]),
    ) as Record<SalleOperationStatut, number>;
    for (const row of sallesRaw) {
      sallesParStatut[row.statut] = parseInt(row.total, 10);
    }

    // --- Labo ---
    const laboParStatut = Object.fromEntries(
      Object.values(DemandeStatut).map((s) => [s, 0]),
    ) as Record<DemandeStatut, number>;
    for (const row of laboRaw) {
      laboParStatut[row.statut] = parseInt(row.total, 10);
    }

    // --- Imagerie ---
    const imagerieParStatut = Object.fromEntries(
      Object.values(DemandeStatut).map((s) => [s, 0]),
    ) as Record<DemandeStatut, number>;
    for (const row of imagerieRaw) {
      imagerieParStatut[row.statut] = parseInt(row.total, 10);
    }

    return {
      lits: { parStatut: litsParStatut, tauxOccupation, admissionsEnCours },
      urgences: { actifs: urgencesActives, parNiveau, cloturesToday: urgencesClotureesTodayRaw },
      bloc: { interventionsAujourdhuiParStatut, sallesParStatut },
      labo: { parStatut: laboParStatut },
      imagerie: { parStatut: imagerieParStatut },
      pharmacie: { stocksSousSeuilAlerte, prescriptionsEnAttente },
      rh: { employesActifs, congesEnCours },
      facturation: {
        recettesDuMois: parseFloat(recettesMois?.total ?? '0'),
        facturesEnAttente,
        devise: 'XOF',
      },
    };
  }
}
