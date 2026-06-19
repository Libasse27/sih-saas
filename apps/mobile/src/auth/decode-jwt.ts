import type { JwtPayload } from '@sih-saas/shared';

/** Décodage local du payload — jeton qui vient d'un login/refresh réussi, le backend reste l'unique source de vérité d'autorisation. */
export function decoderPayload(accessToken: string): JwtPayload {
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
