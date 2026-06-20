import type { ApiResponse } from '@sih-saas/shared';
import { api } from './api';

export interface MfaActivationResult {
  secret: string;
  otpauthUri: string;
}

export async function activer(): Promise<MfaActivationResult> {
  const response = await api.post<ApiResponse<MfaActivationResult>>('/auth/mfa/activer');
  return response.data.data;
}

export async function verifier(code: string): Promise<void> {
  await api.post('/auth/mfa/verifier', { code });
}

export async function desactiver(code: string): Promise<void> {
  await api.post('/auth/mfa/desactiver', { code });
}
