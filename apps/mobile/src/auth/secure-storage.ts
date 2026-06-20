import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Keychain (iOS) / Keystore via EncryptedSharedPreferences (Android) — jamais de jeton en clair.
 * `expo-secure-store` ne supporte pas le web (aucune des méthodes n'existe sur cette plateforme,
 * voir docs Expo) — le web n'est pas une cible de production pour l'app patient (prompt maître
 * §14), seulement un mode de prévisualisation pour le développement. `localStorage` est un repli
 * volontairement non sécurisé réservé à ce mode dev/preview.
 */
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async delete(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
