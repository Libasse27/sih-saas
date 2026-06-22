# SIH SaaS — Plateforme Multi-Établissements de Gestion Hospitalière

Monorepo pnpm. Voir `docs/phase-0/` pour le cadrage complet (cartographie, modèle de données, isolation multi-tenant, RBAC, architecture, plan de phases).

## Structure

```
apps/
  api/       Backend NestJS (PostgreSQL + MongoDB + Redis) — voir apps/api/README.md
  desktop/   Console Electron + Vue (super-admin / établissement) — voir apps/desktop/README.md
  mobile/    App React Native patient — voir apps/mobile/README.md
packages/
  shared/    Types et enums partagés (scope, rôles, permissions, contrats API)
docs/
  phase-0/   Documents de cadrage et conception
```

## Démarrage (développement)

```bash
pnpm install
pnpm docker:dev:up          # PostgreSQL + MongoDB + Redis
cp apps/api/.env.example apps/api/.env
pnpm --filter @sih-saas/api migration:run
pnpm --filter @sih-saas/api seed:rbac
pnpm --filter @sih-saas/api seed:super-admin
pnpm dev:api
```

API disponible sur `http://localhost:3000/api`, documentation Swagger sur `http://localhost:3000/api/docs`.

## Tests

```bash
pnpm test:api               # tests unitaires (mocks, pas de DB requise)
pnpm --filter @sih-saas/api test:integration   # tests d'isolation multi-tenant réels (Postgres + Mongo démarrés)
```

> Important : le backend se connecte à PostgreSQL avec le rôle **`sih_saas_app`** (non-superuser),
> créé automatiquement à la première initialisation du conteneur via
> `infrastructure/docker/postgres-init/01-create-app-role.sql`. Ne jamais faire connecter l'app
> avec le rôle bootstrap `sih_saas` (superuser) — PostgreSQL ignore toujours les policies RLS pour
> un superuser, quel que soit `FORCE ROW LEVEL SECURITY`. Voir docs/phase-0/strategie-isolation.md §2.

## Générer une nouvelle migration

Toujours cibler explicitement `src/database/migrations/<Nom>` (le datasource utilisé en interne est le build compilé `dist/`, mais le fichier de migration généré doit être écrit dans `src/` pour rester versionné — `dist/` est régénéré à chaque build) :

```bash
pnpm --filter @sih-saas/api migration:generate src/database/migrations/NomDeLaMigration
```
