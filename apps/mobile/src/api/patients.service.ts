import type { ApiResponse } from '@sih-saas/shared';
import { TypeConsentement } from '@sih-saas/shared';
import { api } from './client';

export interface ConsentementEntry {
  type: TypeConsentement;
  date: string;
  valeur: boolean;
  enregistrePar: string;
}

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
  consentements: ConsentementEntry[];
}

export async function findMine(): Promise<Patient> {
  const response = await api.get<ApiResponse<Patient>>('/patients/me');
  return response.data.data;
}

export async function enregistrerConsentement(type: TypeConsentement, valeur: boolean): Promise<Patient> {
  const response = await api.post<ApiResponse<Patient>>('/patients/me/consentements', { type, valeur });
  return response.data.data;
}
