# Architecture des modules NestJS — SIH SaaS

**Style** : monolithe modulaire (un seul déploiement backend), découpé en modules NestJS par domaine fonctionnel — pas de microservices en v1. Chaque module est interchangeable plus tard si un besoin de scaling spécifique apparaît (ex. extraction du module Notifications).

## 1. Liste des modules

| Module | Responsabilité | Périmètre |
|---|---|---|
| `AuthModule` | Login unique, JWT access (7j) + refresh (30j, rotatif), bcrypt 12 rounds, MFA, anti-bruteforce | Tous |
| `UsersModule` | CRUD utilisateurs, rôles, permissions | PLATFORM (super-admins) + ETABLISSEMENT (équipe interne, borné par `maxUtilisateurs`) |
| `EtablissementsModule` | CRUD établissements, suspension/réactivation | PLATFORM |
| `PlansModule` | CRUD `Plan` (tarifs, limites, modules, features) | PLATFORM |
| `SubscriptionsModule` | Cycle de vie abonnement, cron de transition de statut, grandfathering, migration de plan | PLATFORM (admin) + ETABLISSEMENT (lecture/renouvellement) |
| `PaymentsModule` | Interface `PaymentProvider` + adaptateurs Stripe/Wave/Orange Money/Carte, webhooks signés et idempotents — **réutilisé par les deux flux** (abonnement et soins) via des implémentations distinctes des cas d'usage | PLATFORM + ETABLISSEMENT |
| `CouponsModule` | CRUD coupons/promotions, validation au paiement | PLATFORM |
| `AuditModule` | Écriture/lecture `audit_logs`, append-only | Tous (écriture interne uniquement) |
| `SettingsModule` | Paramètres globaux (SMTP, clés passerelles chiffrées) | PLATFORM |
| `PatientsModule` | CRUD patients, génération IDH | ETABLISSEMENT |
| `DossierMedicalModule` | DME (Mongo), pièces jointes signées | ETABLISSEMENT + PATIENT (lecture restreinte) |
| `RendezVousModule` | Agenda, RDV | ETABLISSEMENT + PATIENT |
| `ConsultationsModule` | Saisie consultation, lien DME | ETABLISSEMENT |
| `AdmissionsLitsModule` | Admissions, mouvements, lits temps réel (Socket.io) | ETABLISSEMENT |
| `PrescriptionsModule` | Prescriptions + lignes | ETABLISSEMENT |
| `PharmacieModule` | Stock, dispensation, administration médicament | ETABLISSEMENT |
| `LaboratoireModule` | Demandes/résultats d'analyse | ETABLISSEMENT |
| `ImagerieModule` | Demandes/comptes rendus imagerie | ETABLISSEMENT |
| `FacturationPatientModule` | Factures patient, paiements soins, assurances/tiers-payant | ETABLISSEMENT + PATIENT (paiement) |
| `NotificationsModule` | Socket.io + adapter Redis (scalabilité horizontale), push FCM/APNS | Tous |
| `FhirModule` | Mapping interne ↔ ressources FHIR R4, connecteurs externes scopés par établissement | ETABLISSEMENT (si `apiAccess` du plan) |
| `SharedModule` | `TenantContextService`, guards (`TenantGuard`, `PermissionsGuard`, `CareContextGuard`, `SelfAccessGuard`), intercepteur de réponse uniforme, filtre d'exceptions global, décorateurs (`@CurrentUser`, `@RequirePermissions`) | Transversal |

## 2. Structure interne d'un module (Clean Architecture)

Conformément au standard du projet (CLAUDE.md global), chaque module métier (ex. `PrescriptionsModule`) est organisé ainsi :

```
prescriptions/
├── domain/
│   ├── entities/            # Entité métier pure (pas de décorateur ORM)
│   └── repositories/        # Interfaces (ex. PrescriptionRepository)
├── application/
│   ├── use-cases/           # CreerPrescription, ValiderPrescription...
│   └── dto/                 # DTO internes use-case ↔ controller
├── infrastructure/
│   ├── typeorm/              # Entités TypeORM, mapping domain ↔ persistence
│   └── repositories/         # Implémentation concrète des interfaces domain
└── presentation/
    ├── controllers/
    ├── dto/                  # DTO HTTP (class-validator)
    └── guards/                # Guards spécifiques au module si besoin
```

Les modules à cheval Postgres/Mongo (ex. `ConsultationsModule` qui référence un document `DossierMedical`) injectent le repository Mongo correspondant depuis `DossierMedicalModule` plutôt que de dupliquer l'accès Mongoose.

## 3. Pipeline de requête (guards/interceptors, ordre d'exécution)

```
Requête HTTP
  → Middleware JWT (parse + vérifie le token)
  → AsyncLocalStorage.run(context)        [TenantContextService alimenté]
  → JwtAuthGuard                           [authentification]
  → TenantGuard                            [résout etablissementId, bloque cross-scope]
  → PermissionsGuard                       [RBAC statique]
  → CareContextGuard (si ressource clinique) [lien de soin]
  → SelfAccessGuard (si scope=PATIENT)      [restriction à soi-même]
  → TenantRlsInterceptor                   [ouvre transaction + SET LOCAL pour Postgres]
  → Controller → Use-case → Repository
  → ResponseInterceptor                    [formatte { success, data, message, errors? }]
  → AuditInterceptor                       [journalise si ressource sensible]
```

## 4. Conventions transversales (héritées du CLAUDE.md global)

- Réponses API : `{ success: boolean, data, message, errors? }`.
- Pagination : `{ page, limit, total, totalPages }`.
- Validation : `class-validator` + `class-transformer` sur les DTO de présentation (équivalent NestJS-idiomatique du standard Joi/Zod du CLAUDE.md).
- Erreurs : filtre d'exceptions global, codes HTTP standards.
- Sécurité serveur : `helmet`, CORS whitelist par établissement (clé API scopée si `apiAccess`), `express-rate-limit` / `@nestjs/throttler`.
- Documentation : Swagger/OpenAPI généré sur chaque endpoint (`@nestjs/swagger`), JSDoc sur les fonctions exportées.
- Fichiers ≤ 300 lignes, fonctions ≤ 50 lignes.

## 5. Stack technique confirmée pour le backend

Node.js LTS (20.x), NestJS (v10+), **TypeORM** (PostgreSQL), Mongoose (MongoDB), Redis (cache, BullMQ pour les jobs cron — transitions d'abonnement, dunning, notifications), Socket.io + adapter Redis, Passport-JWT, class-validator/class-transformer, Swagger.
