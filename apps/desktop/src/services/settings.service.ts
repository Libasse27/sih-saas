import type { ApiResponse } from '@sih-saas/shared';
import { api } from './api';

export interface SettingEmail {
  nomExpediteur: string | null;
  emailExpediteur: string | null;
  emailSupport: string | null;
}

export interface SettingPaiements {
  actifs: boolean;
}

export interface Settings {
  id: string;
  email: SettingEmail;
  paiements: SettingPaiements;
  updatedAt: string;
}

export interface UpdateSettingsData {
  email?: Partial<SettingEmail>;
  paiements?: Partial<SettingPaiements>;
}

export async function get(): Promise<Settings> {
  const response = await api.get<ApiResponse<Settings>>('/settings');
  return response.data.data;
}

export async function update(dto: UpdateSettingsData): Promise<Settings> {
  const response = await api.patch<ApiResponse<Settings>>('/settings', dto);
  return response.data.data;
}
