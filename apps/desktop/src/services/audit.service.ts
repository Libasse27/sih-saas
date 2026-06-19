import type { ApiResponse } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface AuditLog {
  id: string;
  etablissementId: string | null;
  userId: string | null;
  action: string;
  ressource: string | null;
  ressourceId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export async function findAll(page: number, limit: number, etablissementId?: string): Promise<Paginated<AuditLog>> {
  const response = await api.get<ApiResponse<Paginated<AuditLog>>>('/audit-logs', {
    params: { page, limit, etablissementId },
  });
  return response.data.data;
}
