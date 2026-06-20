import type { ApiResponse, Sexe } from '@sih-saas/shared';
import { api } from './api';

export interface PatientResume {
  id: string;
  idh: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: Sexe;
  telephone: string | null;
}

export interface NoteSociale {
  id: string;
  patientId: string;
  auteurId: string;
  contenu: string;
  createdAt: string;
}

/** GET /patients/recherche/:idh — autorisé via SOCIAL_MANAGE même sans PATIENT_READ (voir patients.controller.ts). */
export async function rechercherParIdh(idh: string): Promise<PatientResume> {
  const response = await api.get<ApiResponse<PatientResume>>(`/patients/recherche/${encodeURIComponent(idh)}`);
  return response.data.data;
}

export async function findAllNotes(patientId: string): Promise<NoteSociale[]> {
  const response = await api.get<ApiResponse<NoteSociale[]>>(`/patients/${patientId}/notes-sociales`);
  return response.data.data;
}

export async function createNote(patientId: string, contenu: string): Promise<NoteSociale> {
  const response = await api.post<ApiResponse<NoteSociale>>(`/patients/${patientId}/notes-sociales`, { contenu });
  return response.data.data;
}
