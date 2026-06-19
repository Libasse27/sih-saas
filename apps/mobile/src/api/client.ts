import type { ApiResponse } from '@sih-saas/shared';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { sessionStore } from '../auth/session-store';
import { showError } from '../components/toast';

declare module 'axios' {
  export interface AxiosRequestConfig {
    silenceErreur?: boolean;
  }
}

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const { accessToken } = sessionStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let rafraichissementEnCours: Promise<void> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<null>>) => {
    const requeteOriginale = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && requeteOriginale && !requeteOriginale._retry) {
      requeteOriginale._retry = true;
      try {
        rafraichissementEnCours ??= sessionStore.refreshTokens();
        await rafraichissementEnCours;
        rafraichissementEnCours = null;
        const { accessToken } = sessionStore.getState();
        requeteOriginale.headers.Authorization = `Bearer ${accessToken}`;
        return api(requeteOriginale);
      } catch {
        rafraichissementEnCours = null;
        await sessionStore.logout();
        showError('Session expirée, merci de vous reconnecter.');
        return Promise.reject(error);
      }
    }

    if (!requeteOriginale?.silenceErreur) {
      const corps = error.response?.data;
      const texte = corps?.message ?? "Une erreur réseau s'est produite.";
      showError(Array.isArray(texte) ? texte.join(', ') : texte);
    }

    return Promise.reject(error);
  },
);
