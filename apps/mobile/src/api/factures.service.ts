import type { ApiResponse, FacturePatientStatut, ModePaiementPatient, PaymentStatut } from '@sih-saas/shared';
import { api } from './client';

export interface LigneFacture {
  libelle: string;
  quantite: number;
  prixUnitaire: number;
}

export interface FacturePatient {
  id: string;
  etablissementId: string;
  patientId: string;
  admissionId: string | null;
  numero: string;
  lignes: LigneFacture[];
  montantTotal: number;
  partAssurance: number;
  partPatient: number;
  statut: FacturePatientStatut;
  dateEmission: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaiementPatient {
  id: string;
  facturePatientId: string;
  montant: number;
  mode: ModePaiementPatient;
  reference: string;
  statut: PaymentStatut;
  date: string;
}

export interface CreatePaiementResult {
  paiement: PaiementPatient;
  redirectUrl?: string;
}

export async function findMine(page = 1, limit = 20): Promise<PaginatedResult<FacturePatient>> {
  const response = await api.get<ApiResponse<PaginatedResult<FacturePatient>>>('/patients/me/factures-patient', {
    params: { page, limit },
  });
  return response.data.data;
}

export async function payer(
  facturePatientId: string,
  montant: number,
  mode: ModePaiementPatient,
): Promise<CreatePaiementResult> {
  const response = await api.post<ApiResponse<CreatePaiementResult>>(`/factures-patient/${facturePatientId}/paiements`, {
    montant,
    mode,
  });
  return response.data.data;
}

export async function getStatutPaiement(reference: string): Promise<PaiementPatient> {
  const response = await api.get<ApiResponse<PaiementPatient>>(`/paiements-patient/statut/${reference}`, {
    silenceErreur: true,
  });
  return response.data.data;
}
