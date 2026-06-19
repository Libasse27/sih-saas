import type { ApiResponse } from '@sih-saas/shared';
import { api } from './client';

export interface AllergieEntry {
  substance: string;
  severite?: string;
  dateConstatee?: string;
}

export interface Antecedents {
  medicaux: string[];
  chirurgicaux: string[];
  familiaux: string[];
  allergies: AllergieEntry[];
}

export interface ObservationEntry {
  date: string;
  auteurId: string;
  contenu: string;
  type: string;
}

export interface CompteRenduEntry {
  date: string;
  auteurId: string;
  type: string;
  contenu: string;
  fichierUrl?: string;
}

export interface DossierMedical {
  patientId: string;
  etablissementId: string;
  antecedents: Antecedents;
  observations: ObservationEntry[];
  comptesRendus: CompteRenduEntry[];
}

export async function findMonDossier(): Promise<DossierMedical> {
  const response = await api.get<ApiResponse<DossierMedical>>('/patients/me/dossier');
  return response.data.data;
}
