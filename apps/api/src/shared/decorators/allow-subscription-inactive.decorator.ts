import { SetMetadata } from '@nestjs/common';

export const ALLOW_SUBSCRIPTION_INACTIVE_KEY = 'allowSubscriptionInactive';

/**
 * Marque une route/contrôleur comme accessible même si l'établissement courant est EXPIRE/SUSPENDU
 * (voir SubscriptionStatusGuard) — réservé aux routes nécessaires pour SORTIR de cet état (gestion
 * de session, consultation/renouvellement d'abonnement, profil établissement) ou sans rapport avec
 * l'activité clinique/métier facturée (ex. AuthController).
 */
export const AllowSubscriptionInactive = () => SetMetadata(ALLOW_SUBSCRIPTION_INACTIVE_KEY, true);
