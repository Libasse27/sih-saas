import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const isDev = !app.isPackaged;

function storeFilePath(): string {
  return path.join(app.getPath('userData'), 'secure-store.json');
}

function readStore(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(storeFilePath(), 'utf8'));
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, string>): void {
  fs.writeFileSync(storeFilePath(), JSON.stringify(store), 'utf8');
}

/**
 * Stockage chiffré des jetons (access/refresh) via `safeStorage` (lié au keychain OS) — jamais en
 * `localStorage` côté renderer (prompt maître §17 « IPC Electron sécurisé »). Si le chiffrement
 * n'est pas disponible sur la plateforme (rare, ex. certains environnements Linux sans trousseau),
 * on échoue explicitement plutôt que de retomber en clair.
 */
ipcMain.handle('secure-store:get', (_event, key: string): string | null => {
  const encrypted = readStore()[key];
  if (!encrypted) {
    return null;
  }
  return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
});

ipcMain.handle('secure-store:set', (_event, key: string, value: string): void => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Chiffrement indisponible sur cette plateforme (trousseau système absent).');
  }
  const store = readStore();
  store[key] = safeStorage.encryptString(value).toString('base64');
  writeStore(store);
});

ipcMain.handle('secure-store:delete', (_event, key: string): void => {
  const store = readStore();
  delete store[key];
  writeStore(store);
});

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'SIH SaaS — Console',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    void win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    void win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

void app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
