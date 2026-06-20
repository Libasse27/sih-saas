import type { ApiResponse, CanalRdv, RendezVousStatut } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface RendezVous {
  id: string;
  patientId: string;
  praticienId: string;
  serviceId: string | null;
  dateHeure: string;
  dureeMin: number;
  motif: string | null;
  canal: CanalRdv;
  statut: RendezVousStatut;
  createdAt: string;
}

export interface CreateRendezVousDto {
  patientId: string;
  praticienId: string;
  serviceId?: string;
  dateHeure: string;
  dureeMin?: number;
  motif?: string;
  canal?: CanalRdv;
}

export async function findAll(
  page: number,
  limit: number,
  filtres: { praticienId?: string; patientId?: string; statut?: RendezVousStatut } = {},
): Promise<Paginated<RendezVous>> {
  const response = await api.get<ApiResponse<Paginated<RendezVous>>>('/rendez-vous', { params: { page, limit, ...filtres } });
  return response.data.data;
}

export async function create(dto: CreateRendezVousDto): Promise<RendezVous> {
  const response = await api.post<ApiResponse<RendezVous>>('/rendez-vous', dto);
  return response.data.data;
}

export async function changerStatut(id: string, statut: RendezVousStatut): Promise<RendezVous> {
  const response = await api.patch<ApiResponse<RendezVous>>(`/rendez-vous/${id}/statut`, { statut });
  return response.data.data;
}
