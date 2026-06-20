import type { ApiResponse, Scope } from '@sih-saas/shared';
import { api } from './api';

export interface LoginResponseUser {
  id: string;
  scope: Scope;
  etablissementId: string | null;
  nom: string;
  prenom: string;
  email: string;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  user: LoginResponseUser;
}

export interface RefreshResponseData {
  accessToken: string;
  refreshToken: string;
}

export async function login(email: string, password: string, mfaCode?: string): Promise<LoginResponseData> {
  const response = await api.post<ApiResponse<LoginResponseData>>('/auth/login', { email, password, mfaCode });
  return response.data.data;
}

export async function refresh(refreshToken: string): Promise<RefreshResponseData> {
  const response = await api.post<ApiResponse<RefreshResponseData>>('/auth/refresh', { refreshToken });
  return response.data.data;
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}

export interface MeResponse {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  mfaEnabled: boolean;
}

export async function me(): Promise<MeResponse> {
  const response = await api.get<ApiResponse<MeResponse>>('/auth/me');
  return response.data.data;
}
