import { io, type Socket } from 'socket.io-client';

/**
 * Namespace Socket.io `/realtime` (apps/api/src/modules/notifications/presentation/realtime.gateway.ts) —
 * diffusion serveur→client uniquement (lits, alertes stock, résultats labo/imagerie disponibles),
 * jamais d'écriture cliente via WS. Le serveur place chaque connexion dans le salon
 * `tenant:{etablissementId}` à l'authentification : un établissement ne reçoit jamais les
 * événements d'un autre, aucun filtrage supplémentaire n'est nécessaire côté client.
 *
 * Le namespace Socket.io n'est PAS sous le préfixe REST `/api` (`app.setGlobalPrefix` ne s'applique
 * qu'aux routes HTTP) — on retire donc tout suffixe `/api` de l'URL de base avant de s'y connecter.
 */
let socket: Socket | null = null;

function baseUrlSansApi(): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000/api';
  return base.replace(/\/api\/?$/, '');
}

export function connecter(accessToken: string): Socket {
  if (socket) {
    deconnecter();
  }
  socket = io(`${baseUrlSansApi()}/realtime`, { auth: { token: accessToken }, transports: ['websocket'] });
  return socket;
}

export function deconnecter(): void {
  socket?.disconnect();
  socket = null;
}

export function obtenirSocket(): Socket | null {
  return socket;
}
