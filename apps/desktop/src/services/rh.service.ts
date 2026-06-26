import type {
  ApiResponse,
  CongeStatut,
  CongeType,
  ContratTravailStatut,
  ContratTravailType,
  EmployeStatut,
  FormationStatut,
  PresenceStatut,
  Sexe,
} from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface Employe {
  id: string;
  etablissementId: string;
  userId: string | null;
  matricule: string;
  nom: string;
  prenom: string;
  poste: string;
  serviceId: string | null;
  statut: EmployeStatut;
  dateEmbauche: string;
  dateNaissance: string | null;
  sexe: Sexe | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContratTravail {
  id: string;
  employeId: string;
  type: ContratTravailType;
  dateDebut: string;
  dateFin: string | null;
  salaireBase: number;
  statut: ContratTravailStatut;
  createdAt: string;
  updatedAt: string;
}

export interface Conge {
  id: string;
  employeId: string;
  type: CongeType;
  dateDebut: string;
  dateFin: string;
  nombreJours: number;
  motif: string | null;
  statut: CongeStatut;
  approuvePar: string | null;
  approuveLe: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Presence {
  id: string;
  employeId: string;
  date: string;
  heureArrivee: string | null;
  heureDepart: string | null;
  statut: PresenceStatut;
  commentaire: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Formation {
  id: string;
  employeId: string;
  intitule: string;
  organisme: string | null;
  dateDebut: string;
  dateFin: string | null;
  statut: FormationStatut;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeDto {
  matricule: string;
  nom: string;
  prenom: string;
  poste: string;
  dateEmbauche: string;
  userId?: string;
  serviceId?: string;
  dateNaissance?: string;
  sexe?: Sexe;
  telephone?: string;
  email?: string;
  adresse?: string;
}

export interface CreateCongeDto {
  type: CongeType;
  dateDebut: string;
  dateFin: string;
  nombreJours: number;
  motif?: string;
}

export interface CreateContratTravailDto {
  type: ContratTravailType;
  dateDebut: string;
  dateFin?: string;
  salaireBase: number;
}

export interface CreatePresenceDto {
  date: string;
  heureArrivee?: string;
  heureDepart?: string;
  statut: PresenceStatut;
  commentaire?: string;
}

export interface CreateFormationDto {
  intitule: string;
  organisme?: string;
  dateDebut: string;
  dateFin?: string;
}

// ── Employés ────────────────────────────────────────────────────────────────

export async function findAllEmployes(page: number, limit: number): Promise<Paginated<Employe>> {
  const response = await api.get<ApiResponse<Paginated<Employe>>>('/employes', { params: { page, limit } });
  return response.data.data;
}

export async function createEmploye(dto: CreateEmployeDto): Promise<Employe> {
  const response = await api.post<ApiResponse<Employe>>('/employes', dto);
  return response.data.data;
}

export async function updateEmploye(id: string, dto: Partial<CreateEmployeDto>): Promise<Employe> {
  const response = await api.patch<ApiResponse<Employe>>(`/employes/${id}`, dto);
  return response.data.data;
}

export async function removeEmploye(id: string): Promise<void> {
  await api.delete<ApiResponse<void>>(`/employes/${id}`);
}

// ── Contrats de travail ──────────────────────────────────────────────────────

export async function findContrats(employeId: string): Promise<ContratTravail[]> {
  const response = await api.get<ApiResponse<ContratTravail[]>>(`/employes/${employeId}/contrats`);
  return response.data.data;
}

export async function createContrat(employeId: string, dto: CreateContratTravailDto): Promise<ContratTravail> {
  const response = await api.post<ApiResponse<ContratTravail>>(`/employes/${employeId}/contrats`, dto);
  return response.data.data;
}

// ── Congés ──────────────────────────────────────────────────────────────────

export async function findConges(employeId: string): Promise<Conge[]> {
  const response = await api.get<ApiResponse<Conge[]>>(`/employes/${employeId}/conges`);
  return response.data.data;
}

export async function createConge(employeId: string, dto: CreateCongeDto): Promise<Conge> {
  const response = await api.post<ApiResponse<Conge>>(`/employes/${employeId}/conges`, dto);
  return response.data.data;
}

export async function validerConge(id: string): Promise<Conge> {
  const response = await api.patch<ApiResponse<Conge>>(`/conges/${id}/valider`);
  return response.data.data;
}

export async function rejeterConge(id: string): Promise<Conge> {
  const response = await api.patch<ApiResponse<Conge>>(`/conges/${id}/rejeter`);
  return response.data.data;
}

// ── Présences ──────────────────────────────────────────────────────────────

export async function findPresences(employeId: string): Promise<Presence[]> {
  const response = await api.get<ApiResponse<Presence[]>>(`/employes/${employeId}/presences`);
  return response.data.data;
}

export async function createPresence(employeId: string, dto: CreatePresenceDto): Promise<Presence> {
  const response = await api.post<ApiResponse<Presence>>(`/employes/${employeId}/presences`, dto);
  return response.data.data;
}

// ── Formations ──────────────────────────────────────────────────────────────

export async function findFormations(employeId: string): Promise<Formation[]> {
  const response = await api.get<ApiResponse<Formation[]>>(`/employes/${employeId}/formations`);
  return response.data.data;
}

export async function createFormation(employeId: string, dto: CreateFormationDto): Promise<Formation> {
  const response = await api.post<ApiResponse<Formation>>(`/employes/${employeId}/formations`, dto);
  return response.data.data;
}
