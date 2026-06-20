// Vérification visuelle de l'app patient (Expo Router web) sans simulateur ni device physique.
//
// Lance le serveur Metro (`pnpm web`) puis un Chromium réel — Microsoft Edge déjà installé sur la
// machine, jamais téléchargé par Playwright — pointé sur ce serveur, et capture une capture d'écran.
// Même principe que apps/desktop/scripts/verify-gui.mjs, adapté au routing par chemin (pas de hash)
// d'Expo Router web.
//
// Usage : node scripts/verify-gui.mjs [route] [nomCapture]
//   node scripts/verify-gui.mjs                  → /, capture dans %TEMP%/sih-mobile-shots
//   node scripts/verify-gui.mjs /profil profil
//
// Pré-requis : le serveur Metro web (`pnpm web`, port 8081) doit déjà tourner.
import { chromium } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

const BASE_URL = process.env.MOBILE_URL || 'http://localhost:8081';
const SHOT_DIR = process.env.SCREENSHOT_DIR || path.join(process.env.TEMP || '/tmp', 'sih-mobile-shots');
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
const route = routeArg || '/';
const shotName = (nameArg || route.replace(/[^a-zA-Z0-9]+/g, '-') || 'accueil') + '.png';

const browser = await chromium.launch({ executablePath: findEdge(), headless: process.env.HEADFUL !== '1' });
try {
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') erreurs.push(msg.text());
  });

  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForTimeout(1500);

  const fichier = path.join(SHOT_DIR, shotName);
  await page.screenshot({ path: fichier });

  console.log('titre:', await page.title());
  console.log('erreurs JS:', erreurs.length ? erreurs : 'aucune');
  console.log('capture:', fichier);
} finally {
  await browser.close();
}
