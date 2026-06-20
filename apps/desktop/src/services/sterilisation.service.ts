import type { ApiResponse, CycleSterilisationStatut } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface CycleSterilisation {
  id: string;
  etablissementId: string;
  materiel: string;
  numeroLot: string;
  statut: CycleSterilisationStatut;
  agentId: string;
  dateDebut: string;
  dateFin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCycleSterilisationDto {
  materiel: string;
  numeroLot: string;
}

export async function findAll(page: number, limit: number): Promise<Paginated<CycleSterilisation>> {
  const response = await api.get<ApiResponse<Paginated<CycleSterilisation>>>('/cycles-sterilisation', {
    params: { page, limit },
  });
  return response.data.data;
}

export async function create(dto: CreateCycleSterilisationDto): Promise<CycleSterilisation> {
  const response = await api.post<ApiResponse<CycleSterilisation>>('/cycles-sterilisation', dto);
  return response.data.data;
}

export async function update(id: string, statut: CycleSterilisationStatut): Promise<CycleSterilisation> {
  const response = await api.patch<ApiResponse<CycleSterilisation>>(`/cycles-sterilisation/${id}`, { statut });
  return response.data.data;
}
