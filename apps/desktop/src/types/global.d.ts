export interface SecureStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

declare global {
  interface Window {
    secureStore: SecureStore;
  }
}
