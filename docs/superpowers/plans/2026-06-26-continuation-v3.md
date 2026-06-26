# SIH SaaS — Plan de continuation PROMPT MAÎTRE v3

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combler les gaps restants du PROMPT MAÎTRE v3 (§8.2 — 15 modules métiers, §23 — phases) en partant de l'état actuel post-phases 0-34.

**Architecture:** Monolithe NestJS modulaire, DDD léger (bounded contexts en modules NestJS), CQRS en spirit (services applicatifs distincts), multi-tenant PostgreSQL RLS + plugin Mongoose, RBAC dynamique, `ModuleMetier` enum comme source unique de feature gating.

**Tech Stack:** NestJS · TypeORM (PostgreSQL `clinic.*`) · Mongoose (MongoDB `dossiers`) · Redis (BullMQ) · Socket.io · Vue.js + Electron (desktop) · React Native/Expo (mobile) · Jest · pnpm monorepo.

## Global Constraints

- Toute table `clinic.*` : `enableTenantRls`/`disableTenantRls` dans la migration (jamais auto par TypeORM).
- Tout service `clinic.*` : `tenantContext.getManager().getRepository(Entity)` — jamais `@InjectRepository`.
- Toute écriture : `auditService.log(...)` avec `action` sous la forme `<resource>.<verb>`.
- `@RequirePlanFeature(ModuleMetier.X)` au niveau classe sur chaque nouveau contrôleur clinique.
- `@RequirePermissions(Permission.X)` sur chaque route (jamais de route ouverte sans RBAC).
- Build (`pnpm --filter @sih-saas/api build`) + tests (`pnpm --filter @sih-saas/api test`) verts avant chaque commit.
- Deux facturations strictement séparées : `Invoice`/`Payment` (abonnement plateforme) ≠ `FacturePatient`/`PaiementPatient` (soins patient).
- Aucun service, rôle, forfait ou règle métier codé en dur — tout en catalogue/seed/base.
- Interface en français, FCFA, Africa/Dakar, +221, fr-SN.

---

## État de départ au 2026-06-26

### Travail non committé (PRIORITÉ 0 — à committer avant tout)

Deux lots discrets déjà buildés et testés (82 suites / 446 tests verts, vérifié en session précédente) :

**Lot A — Rename ClinicalModule → ModuleMetier + PlanFeatureFlagGuard**
- `packages/shared/src/enums/module-metier.enum.ts` (nouveau, 15 valeurs §8.2)
- `packages/shared/src/enums/clinical-module.enum.ts` (supprimé)
- Tous les controllers existants mis à jour (`@RequirePlanFeature(ModuleMetier.X)`)
- `apps/api/src/modules/subscriptions/domain/plan-feature-flag.guard.ts` (nouveau)
- `apps/api/src/modules/subscriptions/domain/require-plan-feature-flag.decorator.ts` (nouveau)
- `apps/api/src/database/migrations/1782254048416-ModulesMetier.ts` (nouvelle migration)
- Mises à jour : `plans.entity.ts`, `create-plan.dto.ts`, `plans.seed.ts`, `plans.service.ts` (desktop)

**Lot B — Module RH complet**
- `apps/api/src/modules/rh/` (entités, services, controllers, DTOs, specs)
- `packages/shared/src/enums/rh.enum.ts` (nouveau)
- `apps/api/src/database/migrations/1782259232957-RhModule.ts` (nouvelle migration)
- `apps/api/src/modules/subscriptions/application/subscriptions.service.ts` (mis à jour)
- `packages/shared/src/enums/permission.enum.ts` (`RH_VIEW` ajouté)

### Modules §8.2 — statut au 2026-06-26

| # | Module | Statut |
|---|--------|--------|
| 1 | Accueil & Admission | ✅ Backend + Desktop + Mobile |
| 2 | Administration & Direction | ⚠️ `Service`/`Etablissement` ✅ — `Budget`/`Contrat`/`DocumentAdministratif` ❌ |
| 3 | Bloc Opératoire | ❌ Plan existant → `docs/superpowers/plans/2026-06-24-bloc-operatoire.md` |
| 4 | Comptabilité & Facturation | ⚠️ Facturation patient ✅ — Comptabilité générale ❌ |
| 5 | Consultations médicales | ✅ Backend + Desktop + Mobile |
| 6 | Hospitalisation | ✅ Backend + Desktop |
| 7 | Imagerie médicale | ✅ Backend + Desktop |
| 8 | Kinésithérapie & Réadaptation | ⚠️ Séances dans DME seulement — module dédié ❌ |
| 9 | Laboratoire | ✅ Backend + Desktop |
| 10 | Logistique & Stock | ✅ Backend + Desktop |
| 11 | Pharmacie | ✅ Backend + Desktop |
| 12 | Ressources Humaines | ⚠️ Backend ✅ (non committé, Lot B) — Desktop ❌ |
| 13 | Sécurité & Conformité | ✅ MFA, RBAC, audit, consentement |
| 14 | Urgences | ✅ Backend + Desktop |
| 15 | Pilotage & BI | ❌ Stats MRR/ARR super-admin seulement |

### Capacités transverses §16

| Capacité | Statut |
|---|---|
| Notifications multicanal (push/email/SMS/in-app) | ⚠️ Email ✅, Push sandbox ✅, SMS ❌, WhatsApp ❌ |
| Files BullMQ | ❌ Câblées mais sans workers réels (notifications via sandbox) |
| Recherche globale MeiliSearch | ❌ Recherche patient par nom/IDH seulement |
| Signature électronique | ❌ |
| GED (pièces jointes chiffrées DME) | ✅ |
| PACS / DICOM | ❌ |
| Téléconsultation | ❌ |
| IA | ❌ |
| BI / Data Warehouse | ❌ |

---

## Ordre d'exécution proposé

### PRIORITÉ 0 — Committer le travail existant

- [ ] Committer Lot A (ModulesMetier rename + PlanFeatureFlagGuard)
- [ ] Committer Lot B (Module RH backend)

### PRIORITÉ 1 — Bloc Opératoire (Module 3)

**Plan existant complet :** `docs/superpowers/plans/2026-06-24-bloc-operatoire.md`
9 tâches TDD prêtes à exécuter. Périmètre backend uniquement (même scope que RH Lot B).

Résumé des tâches :
- Task 1 : Enums + permissions (`SalleOperationStatut`, `InterventionStatut`, `RoleEquipeOperatoire`, `TypeAnesthesie`, `PhaseChecklistOms`, `Permission.BLOC_*`)
- Task 2 : `LogistiqueService.decrementer` + alerte seuil temps réel
- Task 3 : `SalleOperationEntity` + `SallesOperationService`
- Task 4 : `InterventionsService` + 5 entités + 8 DTOs (logique complète)
- Task 5 : Contrôleurs (planning flat + clinical patient-nested)
- Task 6 : `BlocOperatoireModule` + wiring `app.module.ts`
- Task 7 : Migration + seed RBAC (`CHIRURGIEN`, `ANESTHESISTE`, `INFIRMIER_INSTRUMENTISTE`)
- Task 8 : Tests d'intégration RLS
- Task 9 : Commit final + vérification live

### PRIORITÉ 2 — UI Desktop Bloc Opératoire + RH

Après le backend Bloc Opératoire, construire les écrans desktop :
- `SallesOperationView.vue` (planning board des salles)
- `InterventionsView.vue` + `InterventionDetailView.vue` (planning + détail)
- `BlocPatientTab.vue` (onglet "Bloc" dans `PatientDetailView.vue`)
- `RhView.vue` (employés, contrats, congés, présences, formations) — même pattern que `MaintenanceView.vue`

### PRIORITÉ 3 — Comptabilité générale (Module 4 — complément)

Entités : `EcritureComptable`, `JournalCaisse`, `CompteComptable` (plan comptable SYSCOHADA).
Le module Facturation patient existe déjà — ce module est son complément comptable.

**Périmètre minimal viable :**
- Plan comptable SYSCOHADA seedé (comptes 4xx, 7xx, 6xx)
- Écriture automatique à chaque paiement patient validé (`FacturePatient` → `EcritureComptable`)
- Journal de caisse (consultation, export)
- Rapport : solde par compte, balance générale

### PRIORITÉ 4 — Pilotage & BI (Module 15)

**Périmètre :**
- Tableau de bord établissement (occupation lits temps réel, activité labo/imagerie/pharmacie, file urgences)
- Indicateurs clés : taux d'occupation lits, nombre consultations/j, revenus soins du mois
- Vues matérialisées PostgreSQL (rafraîchies par cron) pour les agrégats lourds
- Export PDF/Excel des rapports
- Écrans desktop `DashboardView.vue` (Chart.js, déjà en dépendance)

### PRIORITÉ 5 — Kinésithérapie & Réadaptation (Module 8)

Entités : `SeanceKinesitherapie`, `ProgrammeReeducation`, `EvaluationFonctionnelle`.
À rattacher au patient (nichée `/patients/:patientId/seances-kinesitherapie`).
Réutilise le pattern des séances dans le DME mais dans un module dédié avec son propre RBAC (`KINESITHERAPEUTE`).

### PRIORITÉ 6 — Administration & Direction (Module 2 — complément)

Entités : `Budget`, `Contrat`, `DocumentAdministratif`.
Faible priorité clinique, utile pour l'admin d'établissement.

### PRIORITÉ 7 — Capacités transverses manquantes (§16)

- Workers BullMQ réels (notifications email/SMS, génération PDF)
- SMS (Orange SMS API / Twilio)
- Signature électronique (prescriptions, comptes rendus opératoires)
- Recherche globale MeiliSearch (Patient, Prescription, Facture)
- PACS/DICOM (viewer + serveur)
- IA (assistant médical, résumé DME, OCR ordonnance, codage CIM-10)

---

## Note sur l'alignement DDD/CQRS (§4/§5 du PROMPT MAÎTRE v3)

Le PROMPT MAÎTRE v3 formalise un DDD strict (bounded contexts, agrégats, value objects, domain events) et CQRS (Commands/Queries séparés, EventBus). L'implémentation actuelle est un **monolithe modulaire NestJS** qui respecte l'esprit (un module = un bounded context, services applicatifs, audit via events) mais n'a pas de `CommandBus`/`QueryBus` explicite.

**Décision pragmatique :** pour les nouveaux modules (Bloc Opératoire, Comptabilité, BI), appliquer le même pattern que l'existant (service applicatif direct dans le module) plutôt que d'introduire `@nestjs/cqrs` sur le projet entier — cela éviterait une réécriture massive sans apport fonctionnel immédiat. Si le projet évolue vers une extraction en microservices, le `CommandBus`/`EventBus` sera introduit à ce moment. Les domain events critiques (admission, prescription, facturation) passent déjà par `RealtimeGateway.emitToEtablissement` et `AuditService.log`.

**Event Sourcing (§5) :** versioning append-only déjà en place sur le DME (MongoDB, `DossierMedicalService.ajouterCompteRendu`). Prescriptions et résultats sont immuables une fois validés (statuts `VALIDEE`/`TERMINEE`). À étendre au compte rendu opératoire (Bloc Opératoire) et aux écritures comptables.
