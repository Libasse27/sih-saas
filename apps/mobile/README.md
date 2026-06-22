# @sih-saas/mobile — Application patient (React Native / Expo)

Portail patient : authentification + biométrie, dossier médical (lecture), rendez-vous, messagerie sécurisée, factures de soins + paiement en ligne, notifications push, mode hors-ligne (pause/reprise réseau, jamais de cache disque du contenu médical).

## Stack

Expo (managed) · Expo Router (`Stack.Protected` pour la garde d'auth) · React Query · `react-native-paper` · `expo-secure-store` (Keychain/Keystore) · `expo-local-authentication`.

## Démarrage

```bash
pnpm web         # web preview (Metro), pratique pour itérer sans device/émulateur
pnpm android
pnpm ios
```

L'API doit déjà tourner (`apps/api`). Base URL configurable via `EXPO_PUBLIC_API_BASE_URL` (défaut `http://localhost:3000/api`).

> Tous les scripts passent par `cross-env CI=1` : sans ce flag, le watcher de fichiers Metro échoue
> systématiquement sur ce monorepo Windows (`Failed to start watch mode`). Ne jamais le retirer.
> Un process Metro déjà démarré en `CI=1` ("reloads are disabled") ne relit jamais un fichier modifié
> après coup — le tuer et le relancer pour qu'un changement de code soit pris en compte.

## Vérifications

```bash
pnpm typecheck    # tsc --noEmit
pnpm lint
pnpm build:check  # expo export — bundling Metro réel, sans lancer de serveur
```

## Limites connues

- Aucun projet EAS configuré dans cet environnement → notifications push jamais réellement délivrées (le code applicatif est complet, `getExpoPushTokenAsync()` échoue silencieusement faute de `extra.eas.projectId`).
- Pas de persistance disque du cache React Query (`PersistQueryClientProvider`) par choix délibéré — éviterait de stocker des données de santé en clair sur l'appareil. Une mutation tentée hors-ligne puis l'app tuée avant reconnexion est perdue.
- Pas de Socket.io côté mobile (contrairement au desktop) — fraîcheur de la messagerie assurée par polling React Query + notifications push.
