import type { ApiResponse, TypeReduction } from '@sih-saas/shared';
import { api } from './api';

export interface Coupon {
  id: string;
  code: string;
  typeReduction: TypeReduction;
  valeur: number;
  description: string | null;
  planIds: string[] | null;
  dateDebut: string;
  dateFin: string;
  limiteUtilisation: number;
  utilisationsCount: number;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponFormData {
  code: string;
  typeReduction: TypeReduction;
  valeur: number;
  description?: string;
  planIds?: string[];
  dateDebut: string;
  dateFin: string;
  limiteUtilisation?: number;
}

export async function findAll(): Promise<Coupon[]> {
  const response = await api.get<ApiResponse<Coupon[]>>('/coupons');
  return response.data.data;
}

export async function create(dto: CouponFormData): Promise<Coupon> {
  const response = await api.post<ApiResponse<Coupon>>('/coupons', dto);
  return response.data.data;
}

export async function update(id: string, dto: Partial<CouponFormData>): Promise<Coupon> {
  const response = await api.patch<ApiResponse<Coupon>>(`/coupons/${id}`, dto);
  return response.data.data;
}

export async function activer(id: string): Promise<Coupon> {
  const response = await api.patch<ApiResponse<Coupon>>(`/coupons/${id}/activer`);
  return response.data.data;
}

export async function desactiver(id: string): Promise<Coupon> {
  const response = await api.patch<ApiResponse<Coupon>>(`/coupons/${id}/desactiver`);
  return response.data.data;
}
