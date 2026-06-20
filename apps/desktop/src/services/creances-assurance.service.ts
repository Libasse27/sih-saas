import type { ApiResponse, StatutCreanceAssurance } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface CreanceAssurance {
  id: string;
  facturePatientId: string;
  assuranceId: string;
  montant: number;
  statut: StatutCreanceAssurance;
  dateSoumission: string | null;
  dateReglement: string | null;
  referenceReglement: string | null;
  motifRejet: string | null;
  createdAt: string;
}

export async function findAll(
  page: number,
  limit: number,
  statut?: StatutCreanceAssurance,
): Promise<Paginated<CreanceAssurance>> {
  const response = await api.get<ApiResponse<Paginated<CreanceAssurance>>>('/creances-assurance', {
    params: { page, limit, statut },
  });
  return response.data.data;
}

export async function soumettre(id: string): Promise<CreanceAssurance> {
  const response = await api.patch<ApiResponse<CreanceAssurance>>(`/creances-assurance/${id}/soumettre`);
  return response.data.data;
}

export async function marquerPayee(id: string, referenceReglement: string): Promise<CreanceAssurance> {
  const response = await api.patch<ApiResponse<CreanceAssurance>>(`/creances-assurance/${id}/marquer-payee`, {
    referenceReglement,
  });
  return response.data.data;
}

export async function marquerRejetee(id: string, motifRejet: string): Promise<CreanceAssurance> {
  const response = await api.patch<ApiResponse<CreanceAssurance>>(`/creances-assurance/${id}/marquer-rejetee`, {
    motifRejet,
  });
  return response.data.data;
}
