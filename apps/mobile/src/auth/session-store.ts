import type { JwtPayload } from '@sih-saas/shared';
import * as authService from '../api/auth.service';
import { decoderPayload } from './decode-jwt';
import { secureStorage } from './secure-storage';

const ACCESS_TOKEN_KEY = 'sih_access_token';
const REFRESH_TOKEN_KEY = 'sih_refresh_token';

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  payload: JwtPayload | null;
  /** true une fois la tentative de restauration depuis le stockage sécurisé terminée (évite un flash de login). */
  pret: boolean;
}

let state: SessionState = { accessToken: null, refreshToken: null, payload: null, pret: false };
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export const sessionStore = {
  getState(): SessionState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Appelé une fois au démarrage de l'app, avant d'afficher la moindre route. */
  async restaurer(): Promise<void> {
    const [accessToken, refreshToken] = await Promise.all([
      secureStorage.get(ACCESS_TOKEN_KEY),
      secureStorage.get(REFRESH_TOKEN_KEY),
    ]);

    if (accessToken && refreshToken) {
      state = { accessToken, refreshToken, payload: decoderPayload(accessToken), pret: true };
    } else {
      state = { ...state, pret: true };
    }
    emit();
  },

  async appliquerSession(accessToken: string, refreshToken: string): Promise<void> {
    state = { accessToken, refreshToken, payload: decoderPayload(accessToken), pret: true };
    emit();

    await Promise.all([
      secureStorage.set(ACCESS_TOKEN_KEY, accessToken),
      secureStorage.set(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  },

  /** Appelé par l'intercepteur Axios (api/client.ts) sur un 401 — une seule tentative. */
  async refreshTokens(): Promise<void> {
    if (!state.refreshToken) {
      throw new Error('Aucun jeton de rafraîchissement disponible.');
    }
    const data = await authService.refresh(state.refreshToken);
    await sessionStore.appliquerSession(data.accessToken, data.refreshToken);
  },

  async logout(): Promise<void> {
    try {
      if (state.refreshToken) {
        await authService.logout(state.refreshToken);
      }
    } catch {
      // Non bloquant : on nettoie systématiquement l'état local même si l'appel serveur échoue.
    }

    state = { accessToken: null, refreshToken: null, payload: null, pret: true };
    emit();

    await Promise.all([secureStorage.delete(ACCESS_TOKEN_KEY), secureStorage.delete(REFRESH_TOKEN_KEY)]);
  },
};
