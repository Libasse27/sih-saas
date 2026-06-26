import type {
  ApiResponse,
  DemandeStatut,
  InterventionStatut,
  LitStatut,
  NiveauTriage,
  SalleOperationStatut,
} from '@sih-saas/shared';
import { api } from './api';

// Miroir de DashboardStats (apps/api/src/modules/dashboard-etablissement/application/dashboard-etablissement.service.ts)
export interface DashboardEtablissement {
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

export async function getDashboardEtablissement(): Promise<DashboardEtablissement> {
  const response = await api.get<ApiResponse<DashboardEtablissement>>('/dashboard/etablissement');
  return response.data.data;
}
