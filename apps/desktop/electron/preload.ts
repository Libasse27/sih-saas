import { contextBridge, ipcRenderer } from 'electron';

/**
 * Surface IPC volontairement minimale (contextIsolation + nodeIntegration:false — prompt maître
 * §17 « IPC Electron sécurisé ») : le renderer n'a jamais accès à `fs`/`safeStorage` directement,
 * seulement ce canal get/set/delete déjà chiffré côté process main (electron/main.ts).
 */
contextBridge.exposeInMainWorld('secureStore', {
  get: (key: string): Promise<string | null> => ipcRenderer.invoke('secure-store:get', key),
  set: (key: string, value: string): Promise<void> => ipcRenderer.invoke('secure-store:set', key, value),
  delete: (key: string): Promise<void> => ipcRenderer.invoke('secure-store:delete', key),
});
