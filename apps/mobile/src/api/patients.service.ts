import type { ApiResponse } from '@sih-saas/shared';
import { api } from './client';

export interface Patient {
  id: string;
  etablissementId: string;
  idh: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: string;
  telephone: string | null;
  adresse: string | null;
}

export async function findMine(): Promise<Patient> {
  const response = await api.get<ApiResponse<Patient>>('/patients/me');
  return response.data.data;
}
