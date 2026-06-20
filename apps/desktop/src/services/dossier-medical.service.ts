import type { ApiResponse } from '@sih-saas/shared';
import { api } from './api';

export interface Allergie {
  substance: string;
  severite?: string;
  dateConstatee?: string;
}

export interface Antecedents {
  medicaux: string[];
  chirurgicaux: string[];
  familiaux: string[];
  allergies: Allergie[];
}

export interface Observation {
  date: string;
  auteurId: string;
  contenu: string;
  type: string;
}

export interface CompteRendu {
  date: string;
  auteurId: string;
  type: string;
  contenu: string;
  fichierUrl?: string;
}

export interface DossierMedical {
  patientId: string;
  antecedents: Antecedents;
  observations: Observation[];
  comptesRendus: CompteRendu[];
}

export interface UpdateAntecedentsDto {
  medicaux?: string[];
  chirurgicaux?: string[];
  familiaux?: string[];
  allergies?: Allergie[];
}

export async function findDossier(patientId: string): Promise<DossierMedical> {
  const response = await api.get<ApiResponse<DossierMedical>>(`/patients/${patientId}/dossier`);
  return response.data.data;
}

export async function ajouterObservation(patientId: string, contenu: string, type: string): Promise<DossierMedical> {
  const response = await api.post<ApiResponse<DossierMedical>>(`/patients/${patientId}/dossier/observations`, { contenu, type });
  return response.data.data;
}

export async function mettreAJourAntecedents(patientId: string, dto: UpdateAntecedentsDto): Promise<DossierMedical> {
  const response = await api.patch<ApiResponse<DossierMedical>>(`/patients/${patientId}/dossier/antecedents`, dto);
  return response.data.data;
}

export async function ajouterCompteRendu(
  patientId: string,
  dto: { type: string; contenu: string; fichierUrl?: string },
): Promise<DossierMedical> {
  const response = await api.post<ApiResponse<DossierMedical>>(`/patients/${patientId}/dossier/comptes-rendus`, dto);
  return response.data.data;
}
