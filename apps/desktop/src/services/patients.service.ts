import type { ApiResponse, Sexe } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface ContactUrgence {
  nom: string;
  telephone: string;
  relation: string;
}

export interface Patient {
  id: string;
  idh: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: Sexe;
  telephone: string | null;
  adresse: string | null;
  assuranceId: string | null;
  contactUrgence: ContactUrgence | null;
  userId: string | null;
  createdAt: string;
}

export interface CreatePatientDto {
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: Sexe;
  telephone?: string;
  adresse?: string;
  contactUrgence?: ContactUrgence;
}

export async function findAll(page: number, limit: number, recherche?: string): Promise<Paginated<Patient>> {
  const response = await api.get<ApiResponse<Paginated<Patient>>>('/patients', { params: { page, limit, recherche } });
  return response.data.data;
}

export async function findById(id: string): Promise<Patient> {
  const response = await api.get<ApiResponse<Patient>>(`/patients/${id}`);
  return response.data.data;
}

/** Permission OR (patient:read | social:manage) côté backend — voir patients.controller.ts. */
export async function rechercherParIdh(idh: string): Promise<Patient> {
  const response = await api.get<ApiResponse<Patient>>(`/patients/recherche/${encodeURIComponent(idh)}`);
  return response.data.data;
}

export async function create(dto: CreatePatientDto): Promise<Patient> {
  const response = await api.post<ApiResponse<Patient>>('/patients', dto);
  return response.data.data;
}

export async function update(id: string, dto: Partial<CreatePatientDto>): Promise<Patient> {
  const response = await api.patch<ApiResponse<Patient>>(`/patients/${id}`, dto);
  return response.data.data;
}
