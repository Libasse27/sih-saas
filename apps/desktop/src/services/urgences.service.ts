import type { ApiResponse, NiveauTriage, UrgenceStatut, AlerteUrgenceStatut, IssueUrgence } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface Urgence {
  id: string;
  patientId: string;
  serviceId: string;
  motif: string;
  niveauTriage: NiveauTriage;
  statut: UrgenceStatut;
  medecinPriseEnChargeId: string | null;
  admissionId: string | null;
  dateArrivee: string;
  dateSortie: string | null;
}

export interface Triage {
  id: string;
  niveau: NiveauTriage;
  tensionArterielle: string | null;
  pouls: number | null;
  temperature: number | null;
  saturationO2: number | null;
  effectueParId: string;
  createdAt: string;
}

export interface SurveillanceUrgence {
  id: string;
  tensionArterielle: string | null;
  pouls: number | null;
  temperature: number | null;
  saturationO2: number | null;
  frequenceRespiratoire: number | null;
  glasgow: number | null;
  observation: string | null;
  releveParId: string;
  createdAt: string;
}

export interface AlerteMedicale {
  id: string;
  type: string;
  message: string;
  statut: AlerteUrgenceStatut;
  declencheeParId: string;
  acquitteeParId: string | null;
  dateAcquittement: string | null;
  createdAt: string;
}

export interface UrgenceDetail extends Urgence {
  triages: Triage[];
  surveillances: SurveillanceUrgence[];
  alertes: AlerteMedicale[];
}

export interface CreateUrgenceDto {
  patientId: string;
  motif: string;
  niveauTriage: NiveauTriage;
}

export interface TriageUrgenceDto {
  niveau: NiveauTriage;
  tensionArterielle?: string;
  pouls?: number;
  temperature?: number;
  saturationO2?: number;
}

export interface CreateSurveillanceUrgenceDto {
  tensionArterielle?: string;
  pouls?: number;
  temperature?: number;
  saturationO2?: number;
  frequenceRespiratoire?: number;
  glasgow?: number;
  observation?: string;
}

export interface CreateAlerteMedicaleDto {
  type: string;
  message: string;
}

export interface ClotureUrgenceDto {
  issue: IssueUrgence;
  serviceId?: string;
  litId?: string;
  medecinReferentId?: string;
  dateSortiePrevue?: string;
}

export async function findUrgences(
  page: number,
  limit: number,
  filtres: { statut?: UrgenceStatut; serviceId?: string } = {},
): Promise<Paginated<Urgence>> {
  const response = await api.get<ApiResponse<Paginated<Urgence>>>('/urgences', { params: { page, limit, ...filtres } });
  return response.data.data;
}

export async function findUrgence(id: string): Promise<UrgenceDetail> {
  const response = await api.get<ApiResponse<UrgenceDetail>>(`/urgences/${id}`);
  return response.data.data;
}

export async function createUrgence(dto: CreateUrgenceDto): Promise<Urgence> {
  const response = await api.post<ApiResponse<Urgence>>('/urgences', dto);
  return response.data.data;
}

export async function trierUrgence(id: string, dto: TriageUrgenceDto): Promise<Urgence> {
  const response = await api.patch<ApiResponse<Urgence>>(`/urgences/${id}/triage`, dto);
  return response.data.data;
}

export async function priseEnChargeUrgence(patientId: string, id: string): Promise<Urgence> {
  const response = await api.patch<ApiResponse<Urgence>>(`/patients/${patientId}/urgences/${id}/prise-en-charge`);
  return response.data.data;
}

export async function ajouterSurveillance(
  patientId: string,
  id: string,
  dto: CreateSurveillanceUrgenceDto,
): Promise<SurveillanceUrgence> {
  const response = await api.post<ApiResponse<SurveillanceUrgence>>(`/patients/${patientId}/urgences/${id}/surveillances`, dto);
  return response.data.data;
}

export async function creerAlerte(patientId: string, id: string, dto: CreateAlerteMedicaleDto): Promise<AlerteMedicale> {
  const response = await api.post<ApiResponse<AlerteMedicale>>(`/patients/${patientId}/urgences/${id}/alertes`, dto);
  return response.data.data;
}

export async function acquitterAlerte(patientId: string, id: string, alerteId: string): Promise<AlerteMedicale> {
  const response = await api.patch<ApiResponse<AlerteMedicale>>(`/patients/${patientId}/urgences/${id}/alertes/${alerteId}/acquitter`);
  return response.data.data;
}

export async function cloturerUrgence(patientId: string, id: string, dto: ClotureUrgenceDto): Promise<Urgence> {
  const response = await api.patch<ApiResponse<Urgence>>(`/patients/${patientId}/urgences/${id}/cloture`, dto);
  return response.data.data;
}
