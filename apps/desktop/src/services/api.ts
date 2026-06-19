import type { ApiResponse } from '@sih-saas/shared';
import axios, { AxiosError } from 'axios';
import { message } from 'ant-design-vue';
import { useAuthStore } from '../stores/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

let rafraichissementEnCours: Promise<void> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<null>>) => {
    const requeteOriginale = error.config;
    const auth = useAuthStore();

    if (error.response?.status === 401 && requeteOriginale && !(requeteOriginale as { _retry?: boolean })._retry) {
      (requeteOriginale as { _retry?: boolean })._retry = true;
      try {
        rafraichissementEnCours ??= auth.refreshTokens();
        await rafraichissementEnCours;
        rafraichissementEnCours = null;
        if (requeteOriginale.headers) {
          requeteOriginale.headers.Authorization = `Bearer ${auth.accessToken}`;
        }
        return api(requeteOriginale);
      } catch {
        rafraichissementEnCours = null;
        await auth.logout();
        message.error('Session expirée, merci de vous reconnecter.');
        return Promise.reject(error);
      }
    }

    if (!requeteOriginale?.silenceErreur) {
      const corps = error.response?.data;
      const texte = corps?.message ?? "Une erreur réseau s'est produite.";
      message.error(Array.isArray(texte) ? texte.join(', ') : texte);
    }

    return Promise.reject(error);
  },
);
