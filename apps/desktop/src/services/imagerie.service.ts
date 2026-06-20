import type { ApiResponse, DemandeStatut } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface DemandeImagerie {
  id: string;
  patientId: string;
  prescripteurId: string;
  typeExamen: string;
  urgence: boolean;
  statut: DemandeStatut;
  createdAt: string;
}

export interface CreateDemandeImagerieDto {
  typeExamen: string;
  urgence?: boolean;
}

export interface CompteRenduImagerie {
  id: string;
  demandeId: string;
  fichierDicomUrl: string | null;
  conclusion: string | null;
  valide: boolean;
}

export interface CreateCompteRenduImagerieDto {
  fichierDicomUrl?: string;
  conclusion?: string;
}

export async function findAllForPatient(patientId: string, page: number, limit: number): Promise<Paginated<DemandeImagerie>> {
  const response = await api.get<ApiResponse<Paginated<DemandeImagerie>>>(`/patients/${patientId}/demandes-imagerie`, {
    params: { page, limit },
  });
  return response.data.data;
}

export async function create(patientId: string, dto: CreateDemandeImagerieDto): Promise<DemandeImagerie> {
  const response = await api.post<ApiResponse<DemandeImagerie>>(`/patients/${patientId}/demandes-imagerie`, dto);
  return response.data.data;
}

// --- File de travail (radiologue/manipulateur) ---
export async function findFileDeTravail(page: number, limit: number, statut?: DemandeStatut): Promise<Paginated<DemandeImagerie>> {
  const response = await api.get<ApiResponse<Paginated<DemandeImagerie>>>('/demandes-imagerie', { params: { page, limit, statut } });
  return response.data.data;
}

export async function ecrireCompteRendu(demandeId: string, dto: CreateCompteRenduImagerieDto): Promise<CompteRenduImagerie> {
  const response = await api.post<ApiResponse<CompteRenduImagerie>>(`/demandes-imagerie/${demandeId}/compte-rendu`, dto);
  return response.data.data;
}

export async function findCompteRendu(demandeId: string): Promise<CompteRenduImagerie> {
  const response = await api.get<ApiResponse<CompteRenduImagerie>>(`/demandes-imagerie/${demandeId}/compte-rendu`);
  return response.data.data;
}

export async function validerCompteRendu(demandeId: string, conclusion?: string): Promise<CompteRenduImagerie> {
  const response = await api.patch<ApiResponse<CompteRenduImagerie>>(`/demandes-imagerie/${demandeId}/compte-rendu/valider`, { conclusion });
  return response.data.data;
}
