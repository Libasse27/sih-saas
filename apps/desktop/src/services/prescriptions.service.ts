import type { ApiResponse, PrescriptionStatut } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface PrescriptionLigne {
  id: string;
  prescriptionId: string;
  medicamentId: string;
  posologie: string;
  duree: string;
  voie: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  consultationId: string | null;
  prescripteurId: string;
  date: string;
  statut: PrescriptionStatut;
}

export interface PrescriptionAvecLignes extends Prescription {
  lignes: PrescriptionLigne[];
}

export interface CreatePrescriptionLigneDto {
  medicamentId: string;
  posologie: string;
  duree: string;
  voie: string;
}

export interface CreatePrescriptionDto {
  consultationId?: string;
  lignes: CreatePrescriptionLigneDto[];
}

export async function findAll(patientId: string, page: number, limit: number): Promise<Paginated<Prescription>> {
  const response = await api.get<ApiResponse<Paginated<Prescription>>>(`/patients/${patientId}/prescriptions`, {
    params: { page, limit },
  });
  return response.data.data;
}

export async function findOne(patientId: string, id: string): Promise<PrescriptionAvecLignes> {
  const response = await api.get<ApiResponse<PrescriptionAvecLignes>>(`/patients/${patientId}/prescriptions/${id}`);
  return response.data.data;
}

export async function create(patientId: string, dto: CreatePrescriptionDto): Promise<{ prescription: Prescription; lignes: PrescriptionLigne[] }> {
  const response = await api.post<ApiResponse<{ prescription: Prescription; lignes: PrescriptionLigne[] }>>(
    `/patients/${patientId}/prescriptions`,
    dto,
  );
  return response.data.data;
}

export async function valider(patientId: string, id: string): Promise<Prescription> {
  const response = await api.patch<ApiResponse<Prescription>>(`/patients/${patientId}/prescriptions/${id}/valider`);
  return response.data.data;
}

export async function annuler(patientId: string, id: string): Promise<Prescription> {
  const response = await api.patch<ApiResponse<Prescription>>(`/patients/${patientId}/prescriptions/${id}/annuler`);
  return response.data.data;
}
