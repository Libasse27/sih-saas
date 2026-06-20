import type { JwtPayload, Permission } from '@sih-saas/shared';
import { Scope } from '@sih-saas/shared';
import { defineStore } from 'pinia';
import * as authService from '../services/auth.service';
import { secureStorage } from '../services/secure-storage';

const ACCESS_TOKEN_KEY = 'sih_access_token';
const REFRESH_TOKEN_KEY = 'sih_refresh_token';

/** Décodage local du payload — on vient de recevoir ce jeton d'un login/refresh réussi, pas besoin
 * de vérifier la signature côté renderer (le backend reste l'unique source de vérité d'autorisation). */
function decoderPayload(accessToken: string): JwtPayload {
  const segment = accessToken.split('.')[1];
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((caractere) => '%' + caractere.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  );
  return JSON.parse(json) as JwtPayload;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: null as string | null,
    refreshToken: null as string | null,
    payload: null as JwtPayload | null,
    nomComplet: null as string | null,
    email: null as string | null,
    /** true une fois la tentative de restauration depuis le stockage sécurisé terminée (évite un flash de login). */
    pret: false,
  }),

  getters: {
    estConnecte: (state): boolean => !!state.accessToken && !!state.payload,
    scope: (state): Scope | null => state.payload?.scope ?? null,
    permissions: (state): Permission[] => state.payload?.permissions ?? [],
  },

  actions: {
    aPermission(permission: Permission): boolean {
      return this.payload?.permissions.includes(permission) ?? false;
    },

    /** Appelé une fois au démarrage de l'app (App.vue) avant d'afficher la moindre route. */
    async restaurer(): Promise<void> {
      const [accessToken, refreshToken] = await Promise.all([
        secureStorage.get(ACCESS_TOKEN_KEY),
        secureStorage.get(REFRESH_TOKEN_KEY),
      ]);

      if (accessToken && refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.payload = decoderPayload(accessToken);
      }
      this.pret = true;
    },

    /** Lève une erreur explicite si le compte est de scope PATIENT — réservé à l'app mobile (prompt maître §14). */
    async login(email: string, motDePasse: string, mfaCode?: string): Promise<void> {
      const data = await authService.login(email, motDePasse, mfaCode);

      if (data.user.scope === Scope.PATIENT) {
        throw new Error("Ce compte patient n'est pas autorisé sur la console desktop — utilisez l'application mobile.");
      }

      await this.appliquerSession(data.accessToken, data.refreshToken, data.user.nom, data.user.prenom, data.user.email);
    },

    async appliquerSession(
      accessToken: string,
      refreshToken: string,
      nom: string,
      prenom: string,
      email: string,
    ): Promise<void> {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.payload = decoderPayload(accessToken);
      this.nomComplet = `${prenom} ${nom}`;
      this.email = email;

      await Promise.all([
        secureStorage.set(ACCESS_TOKEN_KEY, accessToken),
        secureStorage.set(REFRESH_TOKEN_KEY, refreshToken),
      ]);
    },

    /** Appelé par l'intercepteur Axios (services/api.ts) sur un 401 — une seule tentative. */
    async refreshTokens(): Promise<void> {
      if (!this.refreshToken) {
        throw new Error('Aucun jeton de rafraîchissement disponible.');
      }

      const data = await authService.refresh(this.refreshToken);
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      this.payload = decoderPayload(data.accessToken);

      await Promise.all([
        secureStorage.set(ACCESS_TOKEN_KEY, data.accessToken),
        secureStorage.set(REFRESH_TOKEN_KEY, data.refreshToken),
      ]);
    },

    async logout(): Promise<void> {
      try {
        if (this.refreshToken) {
          await authService.logout(this.refreshToken);
        }
      } catch {
        // Non bloquant : on nettoie systématiquement l'état local même si l'appel serveur échoue.
      }

      this.accessToken = null;
      this.refreshToken = null;
      this.payload = null;
      this.nomComplet = null;
      this.email = null;

      await Promise.all([secureStorage.delete(ACCESS_TOKEN_KEY), secureStorage.delete(REFRESH_TOKEN_KEY)]);
    },
  },
});
