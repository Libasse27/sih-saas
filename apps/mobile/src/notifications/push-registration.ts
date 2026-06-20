import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as notificationsService from '../api/notifications.service';
import { secureStorage } from '../auth/secure-storage';

const DERNIER_JETON_KEY = 'sih_push_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Appelée après login et à la restauration de session (Phase 14). Pas de jeton sur simulateur/web
 * (`Device.isDevice` false) — dégradation silencieuse, jamais bloquante pour le reste de l'app.
 */
export async function enregistrerPourNotificationsPush(): Promise<void> {
  if (!Device.isDevice || (Platform.OS !== 'ios' && Platform.OS !== 'android')) {
    return;
  }

  const { status: statutExistant } = await Notifications.getPermissionsAsync();
  let statut = statutExistant;
  if (statut !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    statut = status;
  }
  if (statut !== 'granted') {
    return;
  }

  try {
    // `extra.eas.projectId` n'est configuré dans aucun environnement de développement actuel —
    // sans projet EAS lié, l'appel échoue ; capturé ci-dessous, dégradation acceptable (voir
    // SandboxPushProvider côté backend, même réserve que les passerelles de paiement réelles).
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: jeton } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    const dernierJetonEnregistre = await secureStorage.get(DERNIER_JETON_KEY);
    if (dernierJetonEnregistre === jeton) {
      return;
    }

    await notificationsService.enregistrerJeton(jeton, Platform.OS);
    await secureStorage.set(DERNIER_JETON_KEY, jeton);
  } catch {
    // Voir commentaire ci-dessus — jamais bloquant pour la connexion/restauration de session.
  }
}

export async function desinscrireNotificationsPush(): Promise<void> {
  const jeton = await secureStorage.get(DERNIER_JETON_KEY);
  if (!jeton) {
    return;
  }
  try {
    await notificationsService.supprimerJeton(jeton);
  } catch {
    // Non bloquant : la déconnexion locale ne doit jamais échouer pour ça.
  }
  await secureStorage.delete(DERNIER_JETON_KEY);
}
