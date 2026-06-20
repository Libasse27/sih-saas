import { api } from './client';

export async function enregistrerJeton(token: string, plateforme: 'ios' | 'android'): Promise<void> {
  await api.post('/notifications/device-tokens', { token, plateforme });
}

export async function supprimerJeton(token: string): Promise<void> {
  await api.delete(`/notifications/device-tokens/${encodeURIComponent(token)}`);
}
