import type { ApiResponse, Scope } from '@sih-saas/shared';
import axios from 'axios';
import { API_BASE_URL } from './base-url';

/**
 * Instance axios dédiée, volontairement SANS les intercepteurs de `./client` (pas d'attache
 * automatique du Bearer token, pas de retry-on-401) — ce module est justement ce que ces
 * intercepteurs appellent en cas d'expiration (via `sessionStore`), un import de `./client` créerait
 * un cycle (`client -> session-store -> auth.service -> client`). Évite aussi un faux positif réel :
 * un login avec mauvais mot de passe renvoie 401, ce qui déclenchait à tort une tentative de
 * rafraîchissement de jeton (et un toast "Session expirée") sur un simple échec de connexion.
 */
const api = axios.create({ baseURL: API_BASE_URL });

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

export async function login(email: string, password: string): Promise<LoginResponseData> {
  const response = await api.post<ApiResponse<LoginResponseData>>('/auth/login', { email, password });
  return response.data.data;
}

export async function refresh(refreshToken: string): Promise<RefreshResponseData> {
  const response = await api.post<ApiResponse<RefreshResponseData>>('/auth/refresh', { refreshToken });
  return response.data.data;
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}
