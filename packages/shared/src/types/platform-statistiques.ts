import { EtablissementStatut } from '../enums/etablissement.enum';

/** Réponse de GET /subscriptions/statistiques — consommée par le dashboard super-admin (Phase 9). */
export interface PlatformStatistiques {
  etablissements: Record<EtablissementStatut, number>;
  usage: { utilisateurs: number; lits: number; stockageMo: number };
  abonnementsActifs: number;
  mrr: number;
  arr: number;
  devise: string;
}
