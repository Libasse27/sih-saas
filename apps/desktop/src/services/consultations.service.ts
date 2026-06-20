import type { ApiResponse } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface Consultation {
  id: string;
  patientId: string;
  praticienId: string;
  rendezVousId: string | null;
  admissionId: string | null;
  date: string;
  motif: string;
  examenClinique: string | null;
  diagnosticCim10: string | null;
  conclusion: string | null;
}

export interface CreateConsultationDto {
  rendezVousId?: string;
  admissionId?: string;
  motif: string;
  examenClinique?: string;
  diagnosticCim10?: string;
  conclusion?: string;
}

export async function findAll(patientId: string, page: number, limit: number): Promise<Paginated<Consultation>> {
  const response = await api.get<ApiResponse<Paginated<Consultation>>>(`/patients/${patientId}/consultations`, {
    params: { page, limit },
  });
  return response.data.data;
}

export async function create(patientId: string, dto: CreateConsultationDto): Promise<Consultation> {
  const response = await api.post<ApiResponse<Consultation>>(`/patients/${patientId}/consultations`, dto);
  return response.data.data;
}
