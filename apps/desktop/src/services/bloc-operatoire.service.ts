import type { ApiResponse, InterventionStatut, RoleEquipeOperatoire, SalleOperationStatut } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface SalleOperation {
  id: string;
  etablissementId: string;
  nom: string;
  statut: SalleOperationStatut;
  equipement: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Intervention {
  id: string;
  etablissementId: string;
  patientId: string;
  admissionId: string | null;
  salleOperationId: string;
  chirurgienPrincipalId: string;
  typeIntervention: string;
  statut: InterventionStatut;
  dateHeurePrevue: string;
  dureeEstimeeMinutes: number | null;
  dateHeureDebutReelle: string | null;
  dateHeureFinReelle: string | null;
  checklistOms: {
    signIn: { valide: boolean; valideParId: string | null; valideLe: string | null };
    timeOut: { valide: boolean; valideParId: string | null; valideLe: string | null };
    signOut: { valide: boolean; valideParId: string | null; valideLe: string | null };
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalleOperationDto {
  nom: string;
  equipement?: string;
}

export interface UpdateSalleOperationDto {
  nom?: string;
  equipement?: string;
}

export interface CreateInterventionDto {
  patientId: string;
  admissionId?: string;
  salleOperationId: string;
  chirurgienPrincipalId: string;
  typeIntervention: string;
  dateHeurePrevue: string;
  dureeEstimeeMinutes?: number;
}

export interface AjouterMembreEquipeDto {
  userId: string;
  role: RoleEquipeOperatoire;
}

// ── Salles d'opération ──────────────────────────────────────────────────────

export async function findAllSalles(page: number, limit: number): Promise<Paginated<SalleOperation>> {
  const response = await api.get<ApiResponse<Paginated<SalleOperation>>>('/salles-operation', {
    params: { page, limit },
  });
  return response.data.data;
}

export async function createSalle(dto: CreateSalleOperationDto): Promise<SalleOperation> {
  const response = await api.post<ApiResponse<SalleOperation>>('/salles-operation', dto);
  return response.data.data;
}

export async function updateSalle(id: string, dto: UpdateSalleOperationDto): Promise<SalleOperation> {
  const response = await api.patch<ApiResponse<SalleOperation>>(`/salles-operation/${id}`, dto);
  return response.data.data;
}

// ── Interventions (planning board) ─────────────────────────────────────────

export async function findAllInterventions(
  page: number,
  limit: number,
  filtres?: { statut?: InterventionStatut; salleOperationId?: string; patientId?: string },
): Promise<Paginated<Intervention>> {
  const response = await api.get<ApiResponse<Paginated<Intervention>>>('/interventions', {
    params: { page, limit, ...filtres },
  });
  return response.data.data;
}

export async function findIntervention(id: string): Promise<Intervention> {
  const response = await api.get<ApiResponse<Intervention>>(`/interventions/${id}`);
  return response.data.data;
}

export async function createIntervention(dto: CreateInterventionDto): Promise<Intervention> {
  const response = await api.post<ApiResponse<Intervention>>('/interventions', dto);
  return response.data.data;
}

export async function annulerIntervention(id: string): Promise<Intervention> {
  const response = await api.patch<ApiResponse<Intervention>>(`/interventions/${id}/annuler`);
  return response.data.data;
}

// ── Actions cliniques (patient-nested, CareContextGuard) ───────────────────

export async function demarrerIntervention(patientId: string, id: string): Promise<Intervention> {
  const response = await api.patch<ApiResponse<Intervention>>(
    `/patients/${patientId}/interventions/${id}/demarrer`,
  );
  return response.data.data;
}

export async function terminerIntervention(patientId: string, id: string): Promise<Intervention> {
  const response = await api.patch<ApiResponse<Intervention>>(
    `/patients/${patientId}/interventions/${id}/terminer`,
  );
  return response.data.data;
}

export async function ajouterMembreEquipe(id: string, dto: AjouterMembreEquipeDto): Promise<void> {
  await api.post<ApiResponse<unknown>>(`/interventions/${id}/equipe`, dto);
}
