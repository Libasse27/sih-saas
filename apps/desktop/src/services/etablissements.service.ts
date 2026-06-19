import type { ApiResponse, EtablissementStatut, EtablissementType } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface Etablissement {
  id: string;
  code: string;
  nom: string;
  type: EtablissementType;
  rccm: string | null;
  ninea: string | null;
  adresse: string | null;
  ville: string | null;
  pays: string;
  telephone: string | null;
  email: string | null;
  logo: string | null;
  devise: string;
  langue: string;
  fuseau: string;
  adminId: string | null;
  statut: EtablissementStatut;
  abonnementActifId: string | null;
  usage: { utilisateurs: number; lits: number; stockageMo: number };
  createdAt: string;
  updatedAt: string;
}

export async function findAll(page: number, limit: number, statut?: EtablissementStatut): Promise<Paginated<Etablissement>> {
  const response = await api.get<ApiResponse<Paginated<Etablissement>>>('/etablissements', {
    params: { page, limit, statut },
  });
  return response.data.data;
}

export async function findById(id: string): Promise<Etablissement> {
  const response = await api.get<ApiResponse<Etablissement>>(`/etablissements/${id}`);
  return response.data.data;
}

export async function updateStatut(id: string, statut: EtablissementStatut): Promise<Etablissement> {
  const response = await api.patch<ApiResponse<Etablissement>>(`/etablissements/${id}/statut`, { statut });
  return response.data.data;
}
