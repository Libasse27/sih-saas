# @sih-saas/api — Backend NestJS

Cœur multi-tenant de la plateforme : authentification, RBAC, isolation par établissement, tous les modules cliniques et métier. API-first — aucune logique métier critique ne doit vivre dans les clients (desktop/mobile).

Voir `docs/phase-0/` pour le cadrage complet (cartographie fonctionnelle, modèle de données, stratégie d'isolation, matrice RBAC, architecture, plan de phases). Le README racine couvre le démarrage rapide du monorepo entier ; ce document détaille ce qui est spécifique à l'API.

## Stack

NestJS · PostgreSQL (relationnel, RLS multi-tenant) + MongoDB (DME) · Redis (cache/jobs/throttling) · Socket.io (temps réel) · JWT (access + refresh) · TypeORM + Mongoose.

## Démarrage

```bash
cp .env.example .env
pnpm docker:dev:up                  # depuis la racine — Postgres + MongoDB + Redis
pnpm migration:run
pnpm seed:rbac
pnpm seed:plans
pnpm seed:super-admin
pnpm start:dev
```

API sur `http://localhost:3000/api`, Swagger sur `http://localhost:3000/api/docs`.

## Tests

```bash
pnpm test                # unitaires (mocks, aucune DB requise)
pnpm test:integration     # isolation multi-tenant réelle — Postgres + Mongo doivent tourner, jamais en parallèle (tables de test partagées)
pnpm test:cov
```

## Migrations

```bash
pnpm migration:generate src/database/migrations/NomDeLaMigration
pnpm migration:run
pnpm migration:revert
```

Toute nouvelle table du schéma `clinic.*` doit activer RLS via `enableTenantRls`/`disableTenantRls` (`src/database/utils/enable-tenant-rls.util.ts`) — `migration:generate` ne le fait jamais automatiquement.

## Conventions essentielles

- **Réponse API** : toujours `{ success, data, message, errors? }` (`ResponseInterceptor`), sauf `@RawResponse()` (FHIR R4).
- **Isolation tenant** : tout service d'une entité `clinic.*` passe par `tenantContext.getManager().getRepository(Entity)`, jamais `@InjectRepository` direct.
- **Contexte de soin** : tout endpoint clinique nourrissant `CARE_CONTEXT_PERMISSIONS` (`@sih-saas/shared`) doit être nichée sous `/patients/:patientId/...` et gardée par `CareContextGuard`.
- **Forfaits** : jamais de prix/limite/module codé en dur — tout passe par `Plan` → `Subscription.planSnapshot` (grandfathering).
- Rôle PostgreSQL applicatif : `sih_saas_app` (non-superuser, requis pour que RLS s'applique) — jamais le rôle bootstrap `sih_saas`.

## Variables d'environnement notables

Voir `.env.example` pour la liste complète. Sections à connaître :
- `WAVE_*` / `ORANGE_MONEY_*` / `STRIPE_*` — passerelles de paiement réelles (aucune credential fournie par défaut, la passerelle SANDBOX reste active tant qu'elles sont vides).
- `DME_ATTACHMENTS_*` — pièces jointes du dossier médical (stockage chiffré local + lien de téléchargement signé/expirant). `DME_ATTACHMENTS_ENCRYPTION_KEY` doit être une vraie valeur en production (`openssl rand -hex 32`) — sa perte rend les pièces jointes existantes irrécupérables.
- `BACKUP_*` (voir `infrastructure/docker/backup/`) — sauvegardes chiffrées + hors-site.
