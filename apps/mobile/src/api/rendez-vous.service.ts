import type { ApiResponse, CanalRdv, RendezVousStatut } from '@sih-saas/shared';
import { api } from './client';

export interface RendezVous {
  id: string;
  etablissementId: string;
  patientId: string;
  praticienId: string;
  serviceId: string | null;
  dateHeure: string;
  dureeMin: number;
  motif: string | null;
  statut: RendezVousStatut;
  canal: CanalRdv;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateRendezVousPayload {
  praticienId: string;
  serviceId?: string;
  dateHeure: string;
  motif?: string;
  canal?: CanalRdv;
}

export async function findMine(page = 1, limit = 20): Promise<PaginatedResult<RendezVous>> {
  const response = await api.get<ApiResponse<PaginatedResult<RendezVous>>>('/rendez-vous/me', {
    params: { page, limit },
  });
  return response.data.data;
}

export async function creerMien(payload: CreateRendezVousPayload): Promise<RendezVous> {
  const response = await api.post<ApiResponse<RendezVous>>('/rendez-vous/me', payload);
  return response.data.data;
}
