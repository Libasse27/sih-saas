// Vérification visuelle de la console desktop (Vue + Ant Design Vue) sans Electron packagé.
//
// Lance le serveur Vite (`pnpm dev`) puis un Chromium réel — Microsoft Edge déjà installé sur la
// machine, jamais téléchargé par Playwright — pointé sur ce serveur, et capture une capture d'écran
// du formulaire de connexion. Vérifie le RENDU du renderer Vue, pas la coquille Electron native
// (le binaire Electron lui-même n'a jamais pu être téléchargé dans cet environnement : son script
// postinstall est bloqué par la passerelle de sécurité de pnpm — `pnpm approve-builds` nécessite
// une autorisation explicite de l'utilisateur).
//
// Usage : node scripts/verify-gui.mjs [route] [nomCapture]
//   node scripts/verify-gui.mjs                  → /#/login, capture dans %TEMP%/sih-desktop-shots
//   node scripts/verify-gui.mjs /etablissement/lits lits
//
// Pré-requis : le serveur Vite (`pnpm dev`, port 5173) doit déjà tourner — ce script ne le démarre
// pas lui-même pour rester utilisable aussi contre une instance déjà lancée par un humain.
import { chromium } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

const BASE_URL = process.env.DESKTOP_URL || 'http://localhost:5173';
const SHOT_DIR = process.env.SCREENSHOT_DIR || path.join(process.env.TEMP || '/tmp', 'sih-desktop-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function findEdge() {
  const found = EDGE_CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Edge introuvable aux emplacements habituels — adapter EDGE_CANDIDATES dans ce script.');
  return found;
}

const [, , routeArg, nameArg] = process.argv;
const route = routeArg || '/login';
const shotName = (nameArg || route.replace(/[^a-zA-Z0-9]+/g, '-')) + '.png';

const browser = await chromium.launch({ executablePath: findEdge(), headless: process.env.HEADFUL !== '1' });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));

  await page.goto(`${BASE_URL}/#${route}`, { waitUntil: 'load', timeout: 20_000 });
  await page.waitForTimeout(500);

  const fichier = path.join(SHOT_DIR, shotName);
  await page.screenshot({ path: fichier });

  console.log('titre:', await page.title());
  console.log('erreurs JS:', erreurs.length ? erreurs : 'aucune');
  console.log('capture:', fichier);
} finally {
  await browser.close();
}
