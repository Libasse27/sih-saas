import type { ApiResponse, Permission } from '@sih-saas/shared';
import { api } from './api';

export interface ApiKey {
  id: string;
  etablissementId: string;
  nom: string;
  prefixe: string;
  permissions: Permission[];
  actif: boolean;
  expirationDate: string | null;
  derniereUtilisation: string | null;
  createdAt: string;
}

export interface CreateApiKeyDto {
  nom: string;
  permissions: Permission[];
  expirationDate?: string;
}

export interface CreateApiKeyResult {
  apiKey: ApiKey;
  /** Clé brute en clair — retournée une seule fois par le backend, jamais ré-affichable ensuite. */
  cle: string;
}

export async function findAll(): Promise<ApiKey[]> {
  const response = await api.get<ApiResponse<ApiKey[]>>('/etablissements/me/api-keys');
  return response.data.data;
}

export async function create(dto: CreateApiKeyDto): Promise<CreateApiKeyResult> {
  const response = await api.post<ApiResponse<CreateApiKeyResult>>('/etablissements/me/api-keys', dto);
  return response.data.data;
}

export async function revoquer(id: string): Promise<ApiKey> {
  const response = await api.patch<ApiResponse<ApiKey>>(`/etablissements/me/api-keys/${id}/revoquer`);
  return response.data.data;
}
