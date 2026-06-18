# Matrice RBAC — SIH SaaS

RBAC à permissions granulaires, appliqué **côté API** (guards NestJS) et répliqué côté clients (masquage UI), principe de **moindre privilège**. Stockage : `role_permissions` (rôle → permissions par défaut) + `user_permissions` (overrides ALLOW/DENY par utilisateur) — modifiable sans redéploiement par un `ADMIN_ETABLISSEMENT` pour son propre établissement, ou par `SUPER_ADMIN` pour les permissions plateforme.

> **Règle critique** : toute permission marquée 🩺 ci-dessous est en plus filtrée par le `CareContextGuard` (lien de soin actif requis) — voir `strategie-isolation.md` §5. Avoir la permission ne suffit pas si le lien de soin n'existe pas.

## 1. Catalogue de permissions (`ressource:action`)

| Catégorie | Permissions |
|---|---|
| Plateforme | `plan:manage`, `abonnement-plateforme:manage`, `etablissement:manage`, `etablissement:suspend`, `coupon:manage`, `setting-plateforme:manage`, `audit:read:global` |
| Administration établissement | `utilisateur:manage`, `etablissement:settings`, `abonnement-etablissement:view`, `abonnement-etablissement:renew`, `audit:read:local` |
| Patient & dossier | `patient:create`, `patient:read`, `dossier:read` 🩺, `dossier:write` 🩺 |
| RDV / Consultation | `rdv:create`, `rdv:manage`, `consultation:create` 🩺 |
| Admission / Lits | `admission:create`, `lit:view`, `lit:assign`, `lit:liberer` |
| Prescription | `prescription:create` 🩺, `prescription:validate` 🩺 |
| Pharmacie / Stock | `dispensation:create`, `stock:view`, `stock:manage` |
| Administration médicament | `administration:create` 🩺 |
| Laboratoire | `labo:request` 🩺, `labo:result:write`, `labo:result:validate` |
| Imagerie | `imagerie:request` 🩺, `imagerie:report:write`, `imagerie:report:validate` |
| Facturation patient & assurance | `facture-patient:create`, `facture-patient:validate`, `paiement-patient:create`, `assurance:manage` |
| Support | `rh:manage`, `social:manage`, `maintenance:manage`, `sterilisation:manage` |

## 2. Matrice rôle → permissions par défaut

| Rôle | Permissions par défaut |
|---|---|
| `SUPER_ADMIN` (PLATFORM) | Toutes les permissions **Plateforme**. **Aucune** permission clinique ou administrative d'établissement. |
| `ADMIN_ETABLISSEMENT` | `utilisateur:manage`, `etablissement:settings`, `abonnement-etablissement:view`, `abonnement-etablissement:renew`, `audit:read:local` |
| `DIRECTEUR` | Idem `ADMIN_ETABLISSEMENT` + `audit:read:local` (lecture stratégique), pas d'accès clinique sauf cumul avec un rôle médical |
| `ADMIN_SYSTEME` | `utilisateur:manage`, `etablissement:settings` (paramètres techniques uniquement) |
| `MEDECIN` | `patient:read`, `dossier:read` 🩺, `dossier:write` 🩺, `consultation:create` 🩺, `prescription:create` 🩺, `prescription:validate` 🩺, `labo:request` 🩺, `imagerie:request` 🩺, `rdv:create` |
| `CHIRURGIEN` | Idem `MEDECIN` + accès aux comptes rendus opératoires (`dossier:write` 🩺) |
| `INFIRMIER` | `dossier:read` 🩺, `dossier:write` 🩺 (observations), `administration:create` 🩺, `rdv:create` |
| `ANESTHESISTE` | Idem `MEDECIN` restreint au contexte péri-opératoire |
| `SAGE_FEMME` | Idem `INFIRMIER` + `consultation:create` 🩺 (suivi grossesse/accouchement) |
| `PSYCHIATRE` | Idem `MEDECIN`, avec restriction renforcée sur le partage des observations (champ `confidentiel` du DME) |
| `KINESITHERAPEUTE` | `dossier:read` 🩺 (limité aux observations de rééducation), `dossier:write` 🩺 (ses observations) |
| `DIETETICIEN` | `dossier:read` 🩺 (limité), `dossier:write` 🩺 (ses observations nutritionnelles) |
| `RADIOLOGUE` | `imagerie:request` 🩺, `imagerie:report:write`, `imagerie:report:validate`, `dossier:read` 🩺 (contexte de l'examen) |
| `MANIPULATEUR_RADIO` | `imagerie:report:write` (acquisition), pas de validation |
| `LABORANTIN` | `labo:result:write`, `dossier:read` 🩺 (contexte de l'examen) |
| `BIOLOGISTE` | `labo:result:write`, `labo:result:validate`, `dossier:read` 🩺 (contexte de l'examen) |
| `PHARMACIEN` | `dispensation:create`, `stock:manage`, `stock:view`, `dossier:read` 🩺 (limité aux prescriptions en cours) |
| `AGENT_STERILISATION` | `sterilisation:manage` — aucun accès clinique |
| `MAGASINIER` | `stock:view`, `stock:manage` (hors médicaments réglementés selon paramétrage) |
| `TECHNICIEN_MAINTENANCE` | `maintenance:manage` — aucun accès clinique |
| `AGENT_ACCUEIL_ADMISSION` | `patient:create`, `patient:read`, `admission:create`, `lit:view`, `lit:assign` — **aucun accès au contenu du DME** |
| `SECRETAIRE_MEDICALE` | `rdv:create`, `rdv:manage`, `patient:read` — pas de `dossier:read` |
| `CAISSIER_FACTURATION` | `facture-patient:create`, `facture-patient:validate`, `paiement-patient:create` — **aucun accès clinique** |
| `GESTIONNAIRE_LITS` | `lit:view`, `lit:assign`, `lit:liberer` |
| `ASSISTANT_SOCIAL` | `social:manage`, `dossier:read` 🩺 (volet social uniquement) |
| `RH` | `rh:manage` — aucun accès clinique ni administratif établissement |
| `PATIENT` | `dossier:read` (uniquement son propre `patientId`, via `SelfAccessGuard`, pas de `CareContextGuard`), `rdv:create` (ses propres RDV), `paiement-patient:create` (ses propres factures) |

## 3. Principes d'application

1. **Évaluation** : `permissions effectives = (somme des permissions des rôles) + ALLOW overrides − DENY overrides`.
2. **Guards en cascade** (ordre d'exécution) : `JwtAuthGuard` → `TenantGuard` (résout `etablissementId` dans le contexte) → `PermissionsGuard` (RBAC statique) → `CareContextGuard` (lien de soin, si applicable) → `SelfAccessGuard` (scope `PATIENT` uniquement).
3. **Aucune permission clinique pour `SUPER_ADMIN`** : c'est une garantie produit (confidentialité), pas seulement une configuration par défaut — elle doit être imposée au niveau du guard, pas seulement du seed.
4. **Permissions plateforme jamais accessibles à `scope=ETABLISSEMENT`**, quel que soit le rôle — vérifié par `TenantGuard` avant même `PermissionsGuard`.
5. La matrice ci-dessus est le contenu de référence du **seed versionné** `rbac.seed.ts` à livrer en Phase 1 (table `role_permissions`), permettant à un `ADMIN_ETABLISSEMENT` d'ajuster ensuite les permissions de ses équipes via l'UI sans toucher au code.
