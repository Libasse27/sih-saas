import type { ApiResponse } from '@sih-saas/shared';
import { api } from './api';

export interface Promotion {
  id: string;
  nom: string;
  description: string | null;
  regle: Record<string, unknown>;
  periodeDebut: string;
  periodeFin: string;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionFormData {
  nom: string;
  description?: string;
  regle?: Record<string, unknown>;
  periodeDebut: string;
  periodeFin: string;
}

export async function findAll(): Promise<Promotion[]> {
  const response = await api.get<ApiResponse<Promotion[]>>('/promotions');
  return response.data.data;
}

export async function create(dto: PromotionFormData): Promise<Promotion> {
  const response = await api.post<ApiResponse<Promotion>>('/promotions', dto);
  return response.data.data;
}

export async function update(id: string, dto: Partial<PromotionFormData>): Promise<Promotion> {
  const response = await api.patch<ApiResponse<Promotion>>(`/promotions/${id}`, dto);
  return response.data.data;
}

export async function activer(id: string): Promise<Promotion> {
  const response = await api.patch<ApiResponse<Promotion>>(`/promotions/${id}/activer`);
  return response.data.data;
}

export async function desactiver(id: string): Promise<Promotion> {
  const response = await api.patch<ApiResponse<Promotion>>(`/promotions/${id}/desactiver`);
  return response.data.data;
}
