import type { ApiResponse, ClinicalModule, PlanFeatures, PlanLimites, PlanTarifs } from '@sih-saas/shared';
import { api } from './api';

export interface Plan {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  tarifs: PlanTarifs;
  limites: PlanLimites;
  modules: ClinicalModule[];
  features: PlanFeatures;
  essaiGratuitJours: number;
  visible: boolean;
  actif: boolean;
  ordreAffichage: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanFormData {
  code: string;
  nom: string;
  description?: string;
  tarifs: PlanTarifs;
  limites: PlanLimites;
  modules: ClinicalModule[];
  features: PlanFeatures;
  essaiGratuitJours?: number;
  visible?: boolean;
  ordreAffichage?: number;
}

export async function findAllAdmin(): Promise<Plan[]> {
  const response = await api.get<ApiResponse<Plan[]>>('/plans/admin');
  return response.data.data;
}

export async function findById(id: string): Promise<Plan> {
  const response = await api.get<ApiResponse<Plan>>(`/plans/${id}`);
  return response.data.data;
}

export async function create(dto: PlanFormData): Promise<Plan> {
  const response = await api.post<ApiResponse<Plan>>('/plans', dto);
  return response.data.data;
}

export async function update(id: string, dto: Partial<PlanFormData>): Promise<Plan> {
  const response = await api.patch<ApiResponse<Plan>>(`/plans/${id}`, dto);
  return response.data.data;
}

export async function activer(id: string): Promise<Plan> {
  const response = await api.patch<ApiResponse<Plan>>(`/plans/${id}/activer`);
  return response.data.data;
}

export async function desactiver(id: string): Promise<Plan> {
  const response = await api.patch<ApiResponse<Plan>>(`/plans/${id}/desactiver`);
  return response.data.data;
}
