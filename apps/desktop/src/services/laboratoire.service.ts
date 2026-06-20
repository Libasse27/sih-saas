import type { ApiResponse, DemandeStatut } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface DemandeAnalyse {
  id: string;
  patientId: string;
  prescripteurId: string;
  typeAnalyse: string;
  urgence: boolean;
  statut: DemandeStatut;
  createdAt: string;
}

export interface CreateDemandeAnalyseDto {
  typeAnalyse: string;
  urgence?: boolean;
}

export interface ResultatAnalyse {
  id: string;
  demandeId: string;
  resultats: Record<string, unknown>;
  valeursCritiques: boolean;
  fichierUrl: string | null;
  valide: boolean;
}

export interface CreateResultatAnalyseDto {
  resultats: Record<string, unknown>;
  valeursCritiques?: boolean;
  fichierUrl?: string;
}

export async function findAllForPatient(patientId: string, page: number, limit: number): Promise<Paginated<DemandeAnalyse>> {
  const response = await api.get<ApiResponse<Paginated<DemandeAnalyse>>>(`/patients/${patientId}/demandes-analyse`, {
    params: { page, limit },
  });
  return response.data.data;
}

export async function create(patientId: string, dto: CreateDemandeAnalyseDto): Promise<DemandeAnalyse> {
  const response = await api.post<ApiResponse<DemandeAnalyse>>(`/patients/${patientId}/demandes-analyse`, dto);
  return response.data.data;
}

// --- File de travail (laborantin/biologiste) ---
export async function findFileDeTravail(page: number, limit: number, statut?: DemandeStatut): Promise<Paginated<DemandeAnalyse>> {
  const response = await api.get<ApiResponse<Paginated<DemandeAnalyse>>>('/demandes-analyse', { params: { page, limit, statut } });
  return response.data.data;
}

export async function ecrireResultat(demandeId: string, dto: CreateResultatAnalyseDto): Promise<ResultatAnalyse> {
  const response = await api.post<ApiResponse<ResultatAnalyse>>(`/demandes-analyse/${demandeId}/resultat`, dto);
  return response.data.data;
}

export async function findResultat(demandeId: string): Promise<ResultatAnalyse> {
  const response = await api.get<ApiResponse<ResultatAnalyse>>(`/demandes-analyse/${demandeId}/resultat`);
  return response.data.data;
}

export async function validerResultat(demandeId: string): Promise<ResultatAnalyse> {
  const response = await api.patch<ApiResponse<ResultatAnalyse>>(`/demandes-analyse/${demandeId}/resultat/valider`);
  return response.data.data;
}
