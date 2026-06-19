import type { ApiResponse, Role } from '@sih-saas/shared';
import { api } from './client';

export interface Praticien {
  id: string;
  nom: string;
  prenom: string;
  roles: Role[];
}

export async function findPraticiens(): Promise<Praticien[]> {
  const response = await api.get<ApiResponse<Praticien[]>>('/users/praticiens');
  return response.data.data;
}
