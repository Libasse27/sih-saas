import type { ApiResponse, Role } from '@sih-saas/shared';
import { api } from './api';

export interface Praticien {
  id: string;
  nom: string;
  prenom: string;
  roles: Role[];
}

/** Annuaire des praticiens de l'établissement — utilisé pour choisir un praticien (RDV, admission). */
export async function findPraticiens(): Promise<Praticien[]> {
  const response = await api.get<ApiResponse<Praticien[]>>('/users/praticiens');
  return response.data.data;
}
