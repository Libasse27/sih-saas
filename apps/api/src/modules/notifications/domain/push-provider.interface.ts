export interface PushNotification {
  titre: string;
  corps: string;
  data?: Record<string, string>;
}

/**
 * Couche abstraite (Phase 14, prompt maître §14) — seul SandboxPushProvider est câblé pour
 * l'instant (journalise, n'envoie rien réellement). Ajouter Firebase Cloud Messaging / APNS réels
 * = implémenter cette interface avec de vraies clés API, rien d'autre à modifier (même principe
 * que PaymentGateway, Phase 4/15).
 */
export interface PushProvider {
  envoyer(token: string, notification: PushNotification): Promise<void>;
}
