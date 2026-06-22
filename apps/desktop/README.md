# @sih-saas/desktop — Console Electron + Vue

Deux consoles dans une seule application : **plateforme** (super-admin — établissements, forfaits, abonnements, audit) et **établissement** (personnel médical/administratif — modules cliniques, filtrés dynamiquement par RBAC).

## Stack

Vue 3 (Composition API, `<script setup>`) · Vue Router · Pinia · Ant Design Vue · Electron · Chart.js · Socket.io-client.

## Démarrage

```bash
pnpm dev                  # Vite seul, rendu navigateur (http://localhost:5173)
pnpm dev:electron          # Vite + fenêtre Electron native (vrai IPC, secure-storage Keychain-like)
```

L'API doit déjà tourner (`apps/api`, voir son README). Base URL configurable via `VITE_API_BASE_URL` (défaut `http://localhost:3000/api`).

## Build & vérifications

```bash
pnpm typecheck             # vue-tsc --noEmit
pnpm lint
pnpm build                 # vite build + compilation du process Electron (main/preload)
pnpm verify-gui [route] [nom]   # capture d'écran réelle via playwright-core + Edge système, pnpm dev doit déjà tourner
```

## Packaging Windows

```bash
pnpm release:win
```

Cible `zip` fonctionnelle (`release/*-win.zip`). **NSIS/MSI cassés tant que le chemin du projet contient des caractères accentués** (bug confirmé dans `makensis.exe`, voir l'historique du projet) — utiliser le zip en attendant, ou déplacer le dépôt vers un chemin sans accents pour débloquer NSIS.

## Tests E2E

```bash
pnpm e2e        # Cypress headless, contre l'API réelle (jamais mockée)
pnpm e2e:open
```

## Convention de routage important

Toute prop générique d'un slot/binding `a-table`/`a-list` (`:customRender`, `#bodyCell`, etc.) doit référencer une **fonction nommée** déclarée dans `<script setup>` — une arrow function typée inline dans ce contexte précis fait planter `vue-tsc`/`@vue/compiler-sfc` (TS1005/TS1136). Les handlers d'événements (`@click`) n'ont pas cette limite.
