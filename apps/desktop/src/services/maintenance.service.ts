import type { ApiResponse, DemandeMaintenanceStatut } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface DemandeMaintenance {
  id: string;
  etablissementId: string;
  equipement: string;
  localisation: string | null;
  description: string;
  statut: DemandeMaintenanceStatut;
  demandeurId: string;
  technicienId: string | null;
  dateSignalement: string;
  dateResolution: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDemandeMaintenanceDto {
  equipement: string;
  localisation?: string;
  description: string;
}

export interface UpdateDemandeMaintenanceDto {
  statut?: DemandeMaintenanceStatut;
  technicienId?: string;
}

export async function findAll(page: number, limit: number): Promise<Paginated<DemandeMaintenance>> {
  const response = await api.get<ApiResponse<Paginated<DemandeMaintenance>>>('/demandes-maintenance', {
    params: { page, limit },
  });
  return response.data.data;
}

export async function create(dto: CreateDemandeMaintenanceDto): Promise<DemandeMaintenance> {
  const response = await api.post<ApiResponse<DemandeMaintenance>>('/demandes-maintenance', dto);
  return response.data.data;
}

export async function update(id: string, dto: UpdateDemandeMaintenanceDto): Promise<DemandeMaintenance> {
  const response = await api.patch<ApiResponse<DemandeMaintenance>>(`/demandes-maintenance/${id}`, dto);
  return response.data.data;
}
