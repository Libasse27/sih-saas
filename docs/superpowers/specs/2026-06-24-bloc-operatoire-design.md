# Module Bloc Opératoire — Design

Date : 2026-06-24
Référence : prompt maître §10.4, module métier "Bloc Opératoire" (3e des 4 gaps identifiés le 2026-06-23 ;
voir mémoire `project_sih_saas_modules_metiers_revision`).

## Contexte

Aucun code existant pour ce module : le module "Chirurgie" actuel n'est qu'un `Service` (département,
Phase 6), sans planification de salle ni check-list. Construit en s'appuyant directement sur un chantier
non commité découvert en début de session (`git status`) : le renommage `ClinicalModule` → `ModuleMetier`
(taxonomie des 15 modules métiers du §10.4) et le nouveau module RH, tous deux vérifiés (build + 82
suites/446 tests verts) avant de continuer à coder dessus.

Le gabarit le plus proche et le plus récent est le module **Urgences** (livré le 2026-06-23) : board plat +
contrôleur patient-nested pour les actions cliniques. Ce design le suit volontairement de près plutôt que
d'introduire un nouveau style.

## Périmètre de cette itération

- **Backend uniquement** (API NestJS). Pas d'UI desktop cette session — même séquence que Urgences/RH
  (backend vérifié par tests, UI dans une itération ultérieure).
- Une `Intervention` est liée directement à `patientId` (comme `Consultation`/`Prescription`), avec
  `admissionId` **optionnel** — couvre à la fois la chirurgie ambulatoire et le patient déjà hospitalisé,
  sans forcer la création d'une admission artificielle pour un geste d'une heure.
- Les consommables d'intervention décrémentent **réellement** le stock du module Logistique existant
  (`ArticleStockEntity`), pas une simple liste déclarative.

## Entités

Toutes en schéma `clinic`, RLS via `enableTenantRls`/`disableTenantRls` (jamais de SQL RLS à la main),
toujours accédées via `tenantContext.getManager().getRepository(...)` (jamais `@InjectRepository` direct
dans un service, sauf `TypeOrmModule.forFeature` dans le module pour les migrations).

### `SalleOperationEntity` (`clinic.salles_operation`)

| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| etablissementId | uuid | indexé |
| nom | varchar | ex. "Salle 1" |
| equipement | text, nullable | description libre |
| statut | enum `SalleOperationStatut` | `DISPONIBLE` (défaut) / `OCCUPEE` / `HORS_SERVICE` |

`OCCUPEE` est piloté automatiquement par `InterventionsService` (démarrage/clôture), jamais une action
manuelle. `HORS_SERVICE` reste une bascule manuelle (admin établissement, `ETABLISSEMENT_SETTINGS`), pour
signaler une salle en maintenance — pas de phase "nettoyage" trackée séparément (non demandée, YAGNI).

### `InterventionEntity` (`clinic.interventions`)

| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| etablissementId | uuid | indexé |
| patientId | uuid | indexé avec etablissementId |
| admissionId | uuid, nullable | FK informelle vers `AdmissionEntity` |
| salleOperationId | uuid | |
| chirurgienPrincipalId | uuid | FK informelle `platform.users`, mirroir d'état (comme `UrgenceEntity.medecinPriseEnChargeId`) |
| typeIntervention | varchar | libellé libre (pas de nomenclature CCAM cette itération) |
| statut | enum `InterventionStatut` | `PLANIFIEE` (défaut) / `EN_COURS` / `TERMINEE` / `ANNULEE` |
| dateHeurePrevue | timestamptz | |
| dureeEstimeeMinutes | int, nullable | |
| dateHeureDebutReelle | timestamptz, nullable | renseigné par `demarrer()` |
| dateHeureFinReelle | timestamptz, nullable | renseigné par `terminer()` |
| checklistOms | jsonb | `{ signIn, timeOut, signOut }`, chacune `{ valide: boolean, valideParId: uuid\|null, valideLe: timestamptz\|null }` |
| createdAt / updatedAt / deletedAt | timestamptz | soft delete, convention standard |

### `EquipeOperatoireEntity` (`clinic.equipes_operatoire`)

Une ligne par membre par intervention — pas d'équipes-modèles réutilisables (au-delà du besoin réel
identifié : traçabilité "qui a opéré qui").

| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| etablissementId | uuid | indexé |
| interventionId | uuid | indexé avec etablissementId |
| userId | uuid | FK informelle `platform.users` |
| role | enum `RoleEquipeOperatoire` | `CHIRURGIEN_PRINCIPAL` / `CHIRURGIEN_AIDE` / `ANESTHESISTE` / `INFIRMIER_INSTRUMENTISTE` / `INFIRMIER_CIRCULANTE` |

### `AnesthesieEntity` (`clinic.anesthesies`, 1-1 avec Intervention)

| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| etablissementId | uuid | indexé |
| interventionId | uuid | unique |
| anesthesisteId | uuid | FK informelle |
| type | enum `TypeAnesthesie` | `GENERALE` / `LOCOREGIONALE` / `LOCALE` / `SEDATION` |
| scoreAsa | int, nullable | 1-5 |
| produits | jsonb | `[{ nom, dose, voie }]` |
| surveillance | jsonb | `[{ heure, tensionArterielle, pouls, spo2, observation }]` — même esprit que `SurveillanceUrgenceEntity`, mais en jsonb plutôt qu'une table séparée (volume attendu plus faible : quelques relevés par intervention, pas un flux continu multi-jours comme aux urgences) |

### `CompteRenduOperatoireEntity` (`clinic.comptes_rendus_operatoires`, 1-1)

| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| etablissementId | uuid | indexé |
| interventionId | uuid | unique |
| redacteurId | uuid | FK informelle (chirurgien) |
| diagnosticPreOperatoire | text | |
| diagnosticPostOperatoire | text | |
| techniqueUtilisee | text | |
| incidents | text, nullable | |
| contenu | text | compte rendu libre |
| createdAt | timestamptz | |

Sa création réplique aussi l'information dans le DME Mongo via
`DossierMedicalService.ajouterCompteRendu(patientId, { auteurId, type: 'bloc-operatoire', contenu }, etablissementId)`
— même mécanisme que labo/imagerie/réadaptation, pas de nouvelle infra.

### `ConsommableInterventionEntity` (`clinic.consommables_intervention`)

| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| etablissementId | uuid | indexé |
| interventionId | uuid | indexé avec etablissementId |
| articleStockId | uuid | FK informelle vers `ArticleStockEntity` (module Logistique) |
| quantite | int | |
| createdAt | timestamptz | |

Création = appel à une **nouvelle** méthode `LogistiqueService.decrementer(articleStockId, quantite)`,
copie exacte du pattern `StockMedicamentService.decrementer` :
`UPDATE clinic.articles_stock SET quantite = quantite - $1 WHERE id = $2 AND quantite >= $1 RETURNING id`
(`ConflictException` si stock insuffisant), puis émission `afterCommit` d'un événement `stock:alerte` si
`quantite <= seuilAlerte` — **active enfin l'alerte de seuil**, un champ qui existe sur `ArticleStockEntity`
depuis la Phase 11 mais qui n'a jamais eu de décrément réel derrière (même catégorie de découverte que les
"permissions orphelines" notées en Phase 16/RH).

## RBAC — 4 nouvelles permissions

Ajoutées à `Permission` (`packages/shared/src/enums/permission.enum.ts`), section "Bloc opératoire" :

- `BLOC_PLANIFICATION = 'bloc:planification'` — **pas** 🩺. Planifier/modifier/annuler une intervention,
  assigner l'équipe opératoire. Raisonnement identique à `URGENCE_TRIAGE`/`ADMISSION_CREATE` : c'est l'acte
  qui établit le lien de soin pour cette intervention, pas un acte sur un lien déjà établi.
- `BLOC_VIEW = 'bloc:view'` — pas 🩺. Planning du bloc, détail d'une intervention, liste des salles.
- `BLOC_REALISATION = 'bloc:realisation'` — 🩺 (ajoutée à `CARE_CONTEXT_PERMISSIONS`). Démarrer, valider une
  étape de la check-list OMS, consigner anesthésie + surveillance péropératoire, enregistrer un
  consommable, terminer.
- `BLOC_COMPTE_RENDU = 'bloc:compte-rendu'` — 🩺. Rédiger le compte rendu opératoire.

Le CRUD des salles (infrastructure physique) reste sur `ETABLISSEMENT_SETTINGS`, même convention que
`Chambre`/`Lit` (Phase 6) — ce n'est pas un acte clinique.

### Matrice rôle → permission (`rbac.seed.ts`)

| Rôle | Permissions ajoutées |
|---|---|
| `CHIRURGIEN` | `BLOC_PLANIFICATION`, `BLOC_VIEW`, `BLOC_REALISATION`, `BLOC_COMPTE_RENDU` |
| `ANESTHESISTE` | `BLOC_VIEW`, `BLOC_REALISATION` |
| `INFIRMIER` | `BLOC_VIEW`, `BLOC_REALISATION` |

Aucun rôle administratif (`ADMIN_ETABLISSEMENT`/`DIRECTEUR`) ne reçoit de permission Bloc Opératoire —
cohérent avec le fait qu'ils n'ont déjà aucune permission de visibilité clinique sur les autres modules
(ni `LIT_VIEW`, ni `URGENCE_VIEW`, etc.).

## API / routage

Gatés `ModuleMetier.BLOC_OPERATOIRE` (déjà présent dans l'enum) via `PlanFeatureGuard`/`RequirePlanFeature`.

- **`SallesOperationController`** (`/salles-operation`, flat, `Scope.ETABLISSEMENT`)
  - `POST /`, `PATCH /:id` → `ETABLISSEMENT_SETTINGS`
  - `GET /`, `GET /:id` → `BLOC_VIEW`
- **`InterventionsController`** (`/interventions`, flat)
  - `POST /` (planifier) → `BLOC_PLANIFICATION`
  - `GET /`, `GET /:id` (board + détail) → `BLOC_VIEW`
  - `PATCH /:id` (replanifier salle/date), `PATCH /:id/annuler` → `BLOC_PLANIFICATION`
  - `POST /:id/equipe` (ajouter un membre), `DELETE /:id/equipe/:membreId` (retirer) → `BLOC_PLANIFICATION`
- **`InterventionsPatientController`** (`/patients/:patientId/interventions/:id/...`, `CareContextGuard`)
  - `PATCH /demarrer` → `BLOC_REALISATION`
  - `PATCH /checklist` (phase: signIn/timeOut/signOut) → `BLOC_REALISATION`
  - `POST /anesthesie` (créer/compléter), `POST /anesthesie/surveillances` → `BLOC_REALISATION`
  - `POST /consommables` → `BLOC_REALISATION`
  - `PATCH /terminer` → `BLOC_REALISATION`
  - `POST /compte-rendu` → `BLOC_COMPTE_RENDU`

`demarrer()` : `Intervention.statut → EN_COURS`, `dateHeureDebutReelle = now()`, `Salle.statut → OCCUPEE`.
`terminer()` : `Intervention.statut → TERMINEE`, `dateHeureFinReelle = now()`, `Salle.statut → DISPONIBLE`.
Les deux émettent `bloc:salle.updated` (`afterCommit`, `RealtimeGateway.emitToEtablissement`), même pattern
que `lits:updated` (Phase 6).

## Intégrations / dépendances du module

`BlocOperatoireModule` importe : `PatientsModule`, `AdmissionsLitsModule` (validation `admissionId`
optionnelle), `LogistiqueModule` (nouveau `decrementer()` exporté), `DossierMedicalModule` (compte rendu),
`NotificationsModule` (Socket.io), `SubscriptionsModule`, `AuditModule` — toutes des dépendances déjà
existantes, aucune nouvelle infra transversale.

## Migration

Une migration combinée `BlocOperatoire<timestamp>` (convention du projet : une migration par module/phase) :
3 nouveaux enums + 6 tables `clinic.*` avec `enableTenantRls`/`disableTenantRls`, plus l'ajout des 4 valeurs
de permission aux enums Postgres `user_permissions_permission_enum`/`role_permissions_permission_enum`
(même mécanique de rename-recreate que `RhModule1782259232957`, car TypeORM ne sait pas faire un simple
`ALTER TYPE ... ADD VALUE` dans une transaction de façon portable ici).

## Tests

Suites unitaires par service (`InterventionsService`, `SallesOperationService`, `LogistiqueService.decrementer`)
+ au moins une suite d'intégration RLS sur les 6 nouvelles tables (même format que
`rh-rls.integration.spec.ts`). Vérification réelle avant de considérer la phase terminée : migration
appliquée sur la base de dev, `pnpm --filter @sih-saas/api build`, `pnpm --filter @sih-saas/api test`
(régression sur les 446 tests existants), `pnpm --filter @sih-saas/api test:integration`.

## Hors périmètre (explicitement exclu cette itération)

- UI desktop (écrans Vue) — itération ultérieure, comme RH.
- Équipes opératoires réutilisables/nommées (templates) — seulement l'affectation par intervention.
- Phase de nettoyage de salle trackée séparément (statut intermédiaire entre clôture et disponibilité).
- Nomenclature d'actes (CCAM ou équivalent) — `typeIntervention` reste un libellé libre.
- Intégration FHIR (`Procedure` R4) — non demandée, à évaluer si l'interopérabilité FHIR doit couvrir le
  bloc opératoire dans une itération future.
