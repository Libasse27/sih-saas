import type { ApiResponse, AdmissionStatut, LitStatut } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface ServiceClinique {
  id: string;
  nom: string;
  code: string;
  type: string | null;
  responsableId: string | null;
}

export interface CreateServiceDto {
  nom: string;
  code: string;
  type?: string;
  responsableId?: string;
}

export interface Chambre {
  id: string;
  serviceId: string;
  numero: string;
  type: string | null;
}

export interface CreateChambreDto {
  serviceId: string;
  numero: string;
  type?: string;
}

export interface Lit {
  id: string;
  chambreId: string;
  serviceId: string;
  numero: string;
  statut: LitStatut;
  patientActuelId: string | null;
}

export interface CreateLitDto {
  chambreId: string;
  numero: string;
}

export interface Admission {
  id: string;
  patientId: string;
  serviceId: string;
  litId: string | null;
  medecinReferentId: string;
  motif: string;
  dateAdmission: string;
  dateSortiePrevue: string | null;
  dateSortieReelle: string | null;
  statut: AdmissionStatut;
}

export interface CreateAdmissionDto {
  patientId: string;
  serviceId: string;
  litId?: string;
  medecinReferentId: string;
  motif: string;
  dateSortiePrevue?: string;
}

// --- Services ---
export async function findServices(page: number, limit: number): Promise<Paginated<ServiceClinique>> {
  const response = await api.get<ApiResponse<Paginated<ServiceClinique>>>('/services', { params: { page, limit } });
  return response.data.data;
}

export async function createService(dto: CreateServiceDto): Promise<ServiceClinique> {
  const response = await api.post<ApiResponse<ServiceClinique>>('/services', dto);
  return response.data.data;
}

// --- Chambres ---
export async function findChambres(page: number, limit: number, serviceId?: string): Promise<Paginated<Chambre>> {
  const response = await api.get<ApiResponse<Paginated<Chambre>>>('/chambres', { params: { page, limit, serviceId } });
  return response.data.data;
}

export async function createChambre(dto: CreateChambreDto): Promise<Chambre> {
  const response = await api.post<ApiResponse<Chambre>>('/chambres', dto);
  return response.data.data;
}

// --- Lits ---
export async function findLits(page: number, limit: number, filtres: { serviceId?: string; statut?: LitStatut } = {}): Promise<Paginated<Lit>> {
  const response = await api.get<ApiResponse<Paginated<Lit>>>('/lits', { params: { page, limit, ...filtres } });
  return response.data.data;
}

export async function createLit(dto: CreateLitDto): Promise<Lit> {
  const response = await api.post<ApiResponse<Lit>>('/lits', dto);
  return response.data.data;
}

export async function libererLit(id: string): Promise<Lit> {
  const response = await api.patch<ApiResponse<Lit>>(`/lits/${id}/liberer`);
  return response.data.data;
}

export async function changerStatutLit(id: string, statut: LitStatut): Promise<Lit> {
  const response = await api.patch<ApiResponse<Lit>>(`/lits/${id}/statut`, { statut });
  return response.data.data;
}

// --- Admissions ---
export async function findAdmissions(
  page: number,
  limit: number,
  filtres: { patientId?: string; statut?: AdmissionStatut } = {},
): Promise<Paginated<Admission>> {
  const response = await api.get<ApiResponse<Paginated<Admission>>>('/admissions', { params: { page, limit, ...filtres } });
  return response.data.data;
}

export async function createAdmission(dto: CreateAdmissionDto): Promise<Admission> {
  const response = await api.post<ApiResponse<Admission>>('/admissions', dto);
  return response.data.data;
}

export async function transfererAdmission(id: string, litDestinationId: string): Promise<Admission> {
  const response = await api.post<ApiResponse<Admission>>(`/admissions/${id}/transfert`, { litDestinationId });
  return response.data.data;
}

export async function sortieAdmission(id: string): Promise<Admission> {
  const response = await api.patch<ApiResponse<Admission>>(`/admissions/${id}/sortie`);
  return response.data.data;
}
