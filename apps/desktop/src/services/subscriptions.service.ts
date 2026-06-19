import type { ApiResponse, Periodicite, PlanSnapshot, PlatformStatistiques, SubscriptionStatut } from '@sih-saas/shared';
import { AxiosError } from 'axios';
import { api } from './api';

export interface SubscriptionHistoriqueEntry {
  date: string;
  action: string;
  details?: Record<string, unknown>;
}

export interface Subscription {
  id: string;
  etablissementId: string;
  planId: string;
  planSnapshot: PlanSnapshot;
  periodicite: Periodicite;
  dateDebut: string;
  dateFin: string;
  statut: SubscriptionStatut;
  montant: number;
  devise: string;
  renouvellementAuto: boolean;
  couponApplique: string | null;
  historique: SubscriptionHistoriqueEntry[];
  createdAt: string;
  updatedAt: string;
}

function estIntrouvable(erreur: unknown): boolean {
  return erreur instanceof AxiosError && erreur.response?.status === 404;
}

export async function getStatistiques(): Promise<PlatformStatistiques> {
  const response = await api.get<ApiResponse<PlatformStatistiques>>('/subscriptions/statistiques');
  return response.data.data;
}

/** 404 = pas encore d'abonnement (ex. établissement EN_ATTENTE_PAIEMENT) — cas attendu, pas une erreur à signaler. */
export async function findActiveForEtablissement(etablissementId: string): Promise<Subscription | null> {
  try {
    const response = await api.get<ApiResponse<Subscription>>(`/etablissements/${etablissementId}/subscriptions/active`, {
      silenceErreur: true,
    });
    return response.data.data;
  } catch (erreur) {
    if (estIntrouvable(erreur)) {
      return null;
    }
    throw erreur;
  }
}

export async function findMine(): Promise<Subscription | null> {
  try {
    const response = await api.get<ApiResponse<Subscription>>('/etablissements/me/subscription', {
      silenceErreur: true,
    });
    return response.data.data;
  } catch (erreur) {
    if (estIntrouvable(erreur)) {
      return null;
    }
    throw erreur;
  }
}

export async function extend(id: string, jours: number): Promise<Subscription> {
  const response = await api.patch<ApiResponse<Subscription>>(`/subscriptions/${id}/extend`, { jours });
  return response.data.data;
}

export async function migratePlan(id: string): Promise<Subscription> {
  const response = await api.patch<ApiResponse<Subscription>>(`/subscriptions/${id}/migrer-plan`, {});
  return response.data.data;
}

export async function updateStatut(id: string, statut: SubscriptionStatut): Promise<Subscription> {
  const response = await api.patch<ApiResponse<Subscription>>(`/subscriptions/${id}`, { statut });
  return response.data.data;
}
