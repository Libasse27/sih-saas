# Plan de phases — SIH SaaS

Chaque phase est validée avant de passer à la suivante. À la fin de chaque phase : liste des fichiers créés/modifiés + justification brève des choix.

## Phase 0 — Cadrage et conception ✅ (ce dossier)
Cartographie fonctionnelle, modèle de données, stratégie d'isolation, matrice RBAC, architecture des modules, plan de phases. Décisions actées : ORM = TypeORM, portée Phase 0 = documents uniquement.

## Phase 1 — Socle backend
**Objectif** : backend NestJS démarrable, auth fonctionnelle, pas encore d'isolation tenant ni de logique clinique.
- Scaffolding du monorepo (pnpm workspaces : `apps/api`, `apps/desktop`, `apps/mobile`, `packages/shared`), `git init`, `docker-compose.dev.yml` (PostgreSQL, MongoDB, Redis).
- `AuthModule` (login, JWT access+refresh rotatif, bcrypt 12 rounds), `UsersModule`, `EtablissementsModule` (CRUD minimal), `AuditModule` (écriture), `SharedModule` (intercepteur réponse, filtre exceptions).
- Connexions PostgreSQL (TypeORM, schémas `platform`/`clinic` créés mais RLS pas encore activée) + MongoDB (Mongoose).
- Swagger sur tous les endpoints.
- **Validation** : tests unitaires auth (login, refresh, verrouillage anti-bruteforce) + RBAC de base (un `MEDECIN` ne peut pas appeler un endpoint `PLATFORM`).

## Phase 2 — Isolation multi-tenant
- `TenantContextService` (AsyncLocalStorage), middleware de contexte, `TenantGuard`.
- Policies RLS sur toutes les tables `clinic` + `TenantRlsInterceptor` (TypeORM `QueryRunner` + `SET LOCAL`).
- Plugin Mongoose tenant (injection + filtre automatique, bypass contrôlé `PLATFORM`).
- Index composés `{etablissementId, ...}`.
- **Validation** : suite de tests d'isolation — utilisateur A ne lit/écrit jamais les données de B (Postgres ET Mongo), y compris en forçant un ID dans l'URL ; tentative d'INSERT avec `etablissement_id` falsifié rejetée par la policy.

## Phase 3 — Forfaits dynamiques
- `PlansModule` (CRUD `Plan`), seed initial (Standard/Professionnel/Complet) modifiable.
- `SubscriptionsModule` : `planSnapshot` à la souscription, `requirePlanFeature()` (guard décorateur lisant le snapshot), vérification des limites (`usage` vs `limites`) avant création utilisateur/lit/upload.
- Action super-admin « migrer vers la dernière version du plan ».
- `GET /api/plans` public (cache + invalidation à l'édition).
- **Validation** : tests de proration, tests de blocage à la limite (ex. `maxUtilisateurs` atteint), test de grandfathering (modifier un `Plan` n'impacte pas un abonné existant).

## Phase 4 — Inscription + paiement abonnement + provisionnement
- `POST /api/auth/register` (créé établissement `EN_ATTENTE_PAIEMENT` + `ADMIN_ETABLISSEMENT`), `POST /api/payments/initier`, `POST /api/payments/webhook/:provider` (signé, idempotent), `GET /api/payments/statut/:reference`.
- Interface `PaymentProvider` + adaptateurs (au moins un réel + mocks pour les autres en sandbox).
- Provisionnement automatique post-paiement réussi : rôles internes + permissions (seed `rbac.seed.ts` de la matrice RBAC), services par défaut, paramètres (FCFA, fr-SN, Africa/Dakar, numérotation), email de bienvenue.
- **Validation** : test e2e register → paiement (sandbox) → provisionnement → premier login admin.

## Phase 5 — Patient + DME + contexte de soin
- `PatientsModule` (génération IDH), `DossierMedicalModule` (Mongo).
- `CareContextGuard`, `SelfAccessGuard`, journalisation systématique des accès DME.
- **Validation** : tests contexte de soin (soignant sans lien de soin bloqué), tests `SelfAccessGuard` patient.

## Phase 6 — RDV/Consultations + Admissions/Lits/Flux
- `RendezVousModule`, `ConsultationsModule`, `AdmissionsLitsModule` + Socket.io (lits temps réel, filtré par `etablissementId`).
- **Validation** : tests Socket.io (un client de l'établissement A ne reçoit jamais les événements de B).

## Phase 7 — Prescription + Pharmacie + Laboratoire + Imagerie
- `PrescriptionsModule`, `PharmacieModule` (stock, dispensation, administration), `LaboratoireModule`, `ImagerieModule`.
- **Validation** : tests du workflow clinique complet (prescription → dispensation → administration ; demande → résultat → notification → DME).

## Phase 8 — Facturation patient + assurances + paiement soins
- `FacturationPatientModule` (factures, part assurance/patient), assurances/tiers-payant, `PaymentsModule` réutilisé pour le flux soins (mode caisse + mobile money).
- **Validation** : tests facturation (calcul part assurance/reste à charge), tests paiement caisse + mobile money, vérification stricte de la séparation avec les modèles d'abonnement.

## Phase 9 — Desktop (Vue.js + Electron)
- Console plateforme (super-admin) + console établissement (selon RBAC), bandeau d'abonnement.
- **Validation** : tests manuels par profil (super-admin, admin établissement, médecin, caissier...).

## Phase 10 — Mobile patient (React Native)
- Auth + biométrie, dossier personnel, RDV, messagerie, factures + paiement, push, offline + sync.
- **Validation** : tests manuels sur device/émulateur, test du mode hors-ligne.

## Phase 11 — Interopérabilité, sécurité avancée, déploiement
- `FhirModule` (FHIR R4), modules support restants (stérilisation, logistique, RH, social), audit de sécurité OWASP, durcissement (rate limiting, clés API scopées).
- Docker, CI/CD, sauvegardes chiffrées Postgres + Mongo, plan de reprise.
- **Validation** : suite complète de tests d'isolation (tenant + clinique), audit sécurité formel, déploiement staging.

---

## Règle transversale à chaque phase
Ne jamais : exécuter une requête clinique sans `etablissementId` (hors `PLATFORM`) ; confondre isolation tenant et contrôle clinique ; confondre paiement abonnement et paiement soins ; coder en dur prix/limites/modules ; exposer un dossier sans contexte de soin + journalisation ; activer un établissement sans paiement `REUSSI` (sauf essai gratuit).
