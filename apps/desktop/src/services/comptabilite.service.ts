import type { ApiResponse, JournalCode } from '@sih-saas/shared';
import { api } from './api';

export interface EcritureComptable {
  id: string;
  date: string;
  journalCode: string;
  numero: string;
  libelle: string;
  compteDebitCode: string;
  montantDebit: number;
  compteCreditCode: string;
  montantCredit: number;
  pieceRef: string | null;
  saisieParId: string | null;
  createdAt: string;
}

export interface BalanceLigne {
  code: string;
  libelle: string;
  classe: number;
  type: string;
  totalDebit: number;
  totalCredit: number;
  solde: number;
}

export interface CreateEcritureOdDto {
  date: string;
  libelle: string;
  compteDebitCode: string;
  montantDebit: number;
  compteCreditCode: string;
  montantCredit: number;
}

export async function getJournal(params?: {
  dateDebut?: string;
  dateFin?: string;
  journalCode?: JournalCode;
}): Promise<EcritureComptable[]> {
  const response = await api.get<ApiResponse<EcritureComptable[]>>('/comptabilite/journal', { params });
  return response.data.data;
}

export async function getBalance(): Promise<BalanceLigne[]> {
  const response = await api.get<ApiResponse<BalanceLigne[]>>('/comptabilite/balance');
  return response.data.data;
}

export async function creerEcritureOD(dto: CreateEcritureOdDto): Promise<EcritureComptable> {
  const response = await api.post<ApiResponse<EcritureComptable>>('/comptabilite/ecritures/od', dto);
  return response.data.data;
}
