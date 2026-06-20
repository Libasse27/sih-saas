import type { JwtPayload } from '@sih-saas/shared';
import { Scope } from '@sih-saas/shared';
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import * as authService from '../api/auth.service';
import { desinscrireNotificationsPush, enregistrerPourNotificationsPush } from '../notifications/push-registration';
import { biometrieDisponible } from './biometric';
import { secureStorage } from './secure-storage';
import { sessionStore } from './session-store';

const BIOMETRIE_FLAG_KEY = 'sih_biometrie_active';

interface AuthContextValue {
  pret: boolean;
  estConnecte: boolean;
  payload: JwtPayload | null;
  login: (email: string, motDePasse: string) => Promise<void>;
  logout: () => Promise<void>;
  biometrieDisponiblePourCetAppareil: () => Promise<boolean>;
  biometrieActivee: () => Promise<boolean>;
  activerBiometrie: () => Promise<void>;
  desactiverBiometrie: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(sessionStore.subscribe, sessionStore.getState);

  useEffect(() => {
    sessionStore.restaurer();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      pret: state.pret,
      estConnecte: !!state.accessToken && !!state.payload,
      payload: state.payload,

      /** Rejette les comptes non-PATIENT — réservés à la console établissement/desktop. */
      async login(email: string, motDePasse: string) {
        const data = await authService.login(email, motDePasse);
        if (data.user.scope !== Scope.PATIENT) {
          throw new Error('Cette application est réservée aux patients. Utilisez la console établissement.');
        }
        await sessionStore.appliquerSession(data.accessToken, data.refreshToken);
        void enregistrerPourNotificationsPush();
      },

      async logout() {
        await desinscrireNotificationsPush();
        await sessionStore.logout();
        await secureStorage.delete(BIOMETRIE_FLAG_KEY);
      },

      biometrieDisponiblePourCetAppareil: biometrieDisponible,

      async biometrieActivee() {
        return (await secureStorage.get(BIOMETRIE_FLAG_KEY)) === 'true';
      },

      async activerBiometrie() {
        await secureStorage.set(BIOMETRIE_FLAG_KEY, 'true');
      },

      async desactiverBiometrie() {
        await secureStorage.set(BIOMETRIE_FLAG_KEY, 'false');
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé à l’intérieur d’un AuthProvider.');
  }
  return ctx;
}
