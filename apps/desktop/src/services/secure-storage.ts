/**
 * Quand l'app tourne dans Electron, `window.secureStore` (exposé par electron/preload.ts) chiffre
 * via `safeStorage` (keychain OS) — jamais de jeton en clair. Le repli `sessionStorage` ne sert
 * qu'au développement du renderer dans un navigateur classique (`vite dev` sans le shell Electron) ;
 * il n'est jamais utilisé dans l'app packagée.
 */
const hasElectronBridge = typeof window !== 'undefined' && !!window.secureStore;

if (typeof window !== 'undefined' && !hasElectronBridge) {
  console.warn('[secure-storage] Pont Electron absent — repli sessionStorage (développement navigateur uniquement).');
}

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (hasElectronBridge) {
      return window.secureStore.get(key);
    }
    return window.sessionStorage.getItem(key);
  },

  async set(key: string, value: string): Promise<void> {
    if (hasElectronBridge) {
      await window.secureStore.set(key, value);
      return;
    }
    window.sessionStorage.setItem(key, value);
  },

  async delete(key: string): Promise<void> {
    if (hasElectronBridge) {
      await window.secureStore.delete(key);
      return;
    }
    window.sessionStorage.removeItem(key);
  },
};
