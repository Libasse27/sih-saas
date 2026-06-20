import type { ApiResponse, AdministrationStatut } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface MedicamentCatalogue {
  id: string;
  dci: string;
  codeAtc: string | null;
  forme: string;
  dosage: string;
}

export interface CreateMedicamentCatalogueDto {
  dci: string;
  codeAtc?: string;
  forme: string;
  dosage: string;
}

export interface StockMedicament {
  id: string;
  medicamentId: string;
  lot: string;
  quantite: number;
  seuilAlerte: number;
  dateExpiration: string;
  emplacement: string | null;
}

export interface CreateStockMedicamentDto {
  medicamentId: string;
  lot: string;
  quantite: number;
  seuilAlerte: number;
  dateExpiration: string;
  emplacement?: string;
}

export interface LigneDispensee {
  prescriptionLigneId: string;
  medicamentId: string;
  stockMedicamentId: string;
  quantite: number;
}

export interface Dispensation {
  id: string;
  prescriptionId: string;
  pharmacienId: string;
  date: string;
  lignesDispensees: LigneDispensee[];
}

export interface CreateDispensationDto {
  prescriptionId: string;
  lignes: { prescriptionLigneId: string; stockMedicamentId: string; quantite: number }[];
}

export interface AdministrationMedicament {
  id: string;
  patientId: string;
  prescriptionLigneId: string;
  infirmierId: string;
  dateHeure: string;
  statut: AdministrationStatut;
  commentaire: string | null;
}

export interface CreateAdministrationDto {
  prescriptionLigneId: string;
  statut: AdministrationStatut;
  commentaire?: string;
}

// --- Catalogue (référentiel partagé entre établissements) ---
export async function findCatalogue(page: number, limit: number): Promise<Paginated<MedicamentCatalogue>> {
  const response = await api.get<ApiResponse<Paginated<MedicamentCatalogue>>>('/medicaments-catalogue', { params: { page, limit } });
  return response.data.data;
}

export async function createMedicamentCatalogue(dto: CreateMedicamentCatalogueDto): Promise<MedicamentCatalogue> {
  const response = await api.post<ApiResponse<MedicamentCatalogue>>('/medicaments-catalogue', dto);
  return response.data.data;
}

// --- Stock (par établissement) ---
export async function findStock(page: number, limit: number, medicamentId?: string): Promise<Paginated<StockMedicament>> {
  const response = await api.get<ApiResponse<Paginated<StockMedicament>>>('/stock-medicament', { params: { page, limit, medicamentId } });
  return response.data.data;
}

export async function createStock(dto: CreateStockMedicamentDto): Promise<StockMedicament> {
  const response = await api.post<ApiResponse<StockMedicament>>('/stock-medicament', dto);
  return response.data.data;
}

// --- Dispensations ---
export async function createDispensation(dto: CreateDispensationDto): Promise<Dispensation> {
  const response = await api.post<ApiResponse<Dispensation>>('/dispensations', dto);
  return response.data.data;
}

// --- Administration (nichée sous patient) ---
export async function findAdministrations(patientId: string, page: number, limit: number): Promise<Paginated<AdministrationMedicament>> {
  const response = await api.get<ApiResponse<Paginated<AdministrationMedicament>>>(`/patients/${patientId}/administrations`, {
    params: { page, limit },
  });
  return response.data.data;
}

export async function createAdministration(patientId: string, dto: CreateAdministrationDto): Promise<AdministrationMedicament> {
  const response = await api.post<ApiResponse<AdministrationMedicament>>(`/patients/${patientId}/administrations`, dto);
  return response.data.data;
}
