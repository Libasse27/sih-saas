import type { ApiResponse, FacturePatientStatut, ModePaiementPatient, OrganismeAssurance, PaymentStatut } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface Assurance {
  id: string;
  patientId: string;
  organisme: OrganismeAssurance;
  numeroPolice: string;
  tauxCouverture: number;
  valideDu: string;
  valideAu: string;
}

export interface CreateAssuranceDto {
  organisme: OrganismeAssurance;
  numeroPolice: string;
  tauxCouverture: number;
  valideDu: string;
  valideAu: string;
}

export interface LigneFacture {
  libelle: string;
  quantite: number;
  prixUnitaire: number;
}

export interface FacturePatient {
  id: string;
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

export interface CreateFacturePatientDto {
  admissionId?: string;
  lignes: LigneFacture[];
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

export interface CreatePaiementPatientDto {
  montant: number;
  mode: ModePaiementPatient;
}

// --- Assurances (nichées sous patient) ---
export async function findAssurances(patientId: string): Promise<Assurance[]> {
  const response = await api.get<ApiResponse<Assurance[]>>(`/patients/${patientId}/assurances`);
  return response.data.data;
}

export async function createAssurance(patientId: string, dto: CreateAssuranceDto): Promise<Assurance> {
  const response = await api.post<ApiResponse<Assurance>>(`/patients/${patientId}/assurances`, dto);
  return response.data.data;
}

// --- Factures (nichées sous patient pour la création/lecture patient-scopée) ---
export async function findFacturesForPatient(patientId: string, page: number, limit: number): Promise<Paginated<FacturePatient>> {
  const response = await api.get<ApiResponse<Paginated<FacturePatient>>>(`/patients/${patientId}/factures-patient`, {
    params: { page, limit },
  });
  return response.data.data;
}

export async function createFacture(patientId: string, dto: CreateFacturePatientDto): Promise<FacturePatient> {
  const response = await api.post<ApiResponse<FacturePatient>>(`/patients/${patientId}/factures-patient`, dto);
  return response.data.data;
}

// --- Caisse (vue globale établissement) ---
export async function findAllFactures(page: number, limit: number, statut?: FacturePatientStatut): Promise<Paginated<FacturePatient>> {
  const response = await api.get<ApiResponse<Paginated<FacturePatient>>>('/factures-patient', { params: { page, limit, statut } });
  return response.data.data;
}

export async function annulerFacture(id: string): Promise<FacturePatient> {
  const response = await api.patch<ApiResponse<FacturePatient>>(`/factures-patient/${id}/annuler`);
  return response.data.data;
}

// --- Paiements ---
export async function findPaiements(facturePatientId: string): Promise<PaiementPatient[]> {
  const response = await api.get<ApiResponse<PaiementPatient[]>>(`/factures-patient/${facturePatientId}/paiements`);
  return response.data.data;
}

export async function createPaiement(facturePatientId: string, dto: CreatePaiementPatientDto): Promise<PaiementPatient> {
  const response = await api.post<ApiResponse<PaiementPatient>>(`/factures-patient/${facturePatientId}/paiements`, dto);
  return response.data.data;
}
