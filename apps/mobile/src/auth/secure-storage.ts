import * as SecureStore from 'expo-secure-store';

/** Keychain (iOS) / Keystore via EncryptedSharedPreferences (Android) — jamais de jeton en clair. */
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },

  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },

  async delete(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};
