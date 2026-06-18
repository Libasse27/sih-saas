# Cartographie fonctionnelle — SIH SaaS Multi-Établissements

Contexte sénégalais / ouest-africain : interface en français, devise FCFA (XOF), fuseau `Africa/Dakar`, locale `fr-SN`, téléphone `+221`, identifiant patient **IDH**.

## 1. Les trois composants

| Composant | Stack | Public |
|---|---|---|
| **API Backend** | NestJS + PostgreSQL + MongoDB + Redis + Socket.io + JWT | Source de vérité unique. Aucune logique métier critique côté client. |
| **Application Desktop** | Vue.js + Electron, Ant Design Vue, Pinia, Chart.js | Une seule application, deux consoles routées par `scope` du JWT. |
| **Application Mobile** | React Native, FCM/APNS, stockage chiffré, biométrie | Patients uniquement, rattachés à leur établissement. |

## 2. Les trois périmètres (`scope`)

```
scope: 'PLATFORM'      → SUPER_ADMIN, etablissementId = null
scope: 'ETABLISSEMENT' → personnel médical/administratif, etablissementId obligatoire
scope: 'PATIENT'       → app mobile, etablissementId obligatoire
```

- **Super-admin** (opérateur de la plateforme) : gère les établissements clients, les forfaits (`Plan`), les abonnements. Ne voit jamais de données cliniques.
- **Admin établissement** (créé à l'inscription) : gère uniquement son hôpital — utilisateurs internes, profil, abonnement, tous les modules cliniques de son établissement.
- **Patient** : accède uniquement à son propre dossier, dans son propre établissement.

## 3. Rôles par périmètre

| Périmètre | Rôles |
|---|---|
| PLATFORM | `SUPER_ADMIN` (+ rôles support plateforme futurs) |
| ETABLISSEMENT — Direction/Système | `ADMIN_ETABLISSEMENT` (créateur), `DIRECTEUR`, `ADMIN_SYSTEME` |
| ETABLISSEMENT — Médical | `MEDECIN`, `CHIRURGIEN`, `INFIRMIER`, `ANESTHESISTE`, `SAGE_FEMME`, `PSYCHIATRE`, `KINESITHERAPEUTE`, `DIETETICIEN` |
| ETABLISSEMENT — Diagnostic | `RADIOLOGUE`, `MANIPULATEUR_RADIO`, `LABORANTIN`, `BIOLOGISTE` |
| ETABLISSEMENT — Pharmacie/Logistique | `PHARMACIEN`, `AGENT_STERILISATION`, `MAGASINIER`, `TECHNICIEN_MAINTENANCE` |
| ETABLISSEMENT — Administratif | `AGENT_ACCUEIL_ADMISSION`, `SECRETAIRE_MEDICALE`, `CAISSIER_FACTURATION`, `GESTIONNAIRE_LITS`, `ASSISTANT_SOCIAL`, `RH` |
| PATIENT | `PATIENT` |

## 4. Modules fonctionnels

**Plateforme (super-admin)** : établissements, forfaits (`Plan`), abonnements, paiements/factures d'abonnement, coupons/promotions, paramètres globaux, audit, statistiques (MRR/ARR, usage).

**Établissement (cliniques + support)** : DME, RDV/Consultations, Admissions/Lits/Flux patient, Prescription, Pharmacie (stock + dispensation), Laboratoire, Imagerie, Facturation patient + Assurances, Stérilisation, Logistique/Maintenance, RH, Social, Réadaptation, Diététique.

**Patient (mobile)** : authentification + biométrie, dossier personnel (lecture), RDV, messagerie sécurisée, suivi santé, factures de soins + paiement en ligne, notifications push, mode hors-ligne + sync.

## 5. Parcours de bout en bout (chaque parcours traverse plusieurs modules et doit rester cohérent dans un seul établissement)

1. **Inscription → activation** : `POST /auth/register` crée l'établissement (`EN_ATTENTE_PAIEMENT`) + l'admin établissement → paiement abonnement (ou essai gratuit) → provisionnement automatique (rôles, services par défaut, paramètres, numérotation) → email de bienvenue → premier login.
2. **Admission** : accueil → création/recherche patient (IDH) → admission → affectation lit (mise à jour temps réel via Socket.io).
3. **Consultation** : RDV → consultation → saisie DME (Mongo) → prescription et/ou demande d'examen.
4. **Circuit du médicament** : prescription → dispensation pharmacie (vérifie le stock) → administration infirmière (traçée).
5. **Diagnostic** : demande labo/imagerie → résultat/compte-rendu → notification au prescripteur → ajout au DME.
6. **Sortie** : préparation de sortie → compte-rendu → facture patient (part assurance + reste à charge) → paiement (caisse ou mobile money) → libération du lit en temps réel.
7. **Cycle de vie de l'abonnement** : essai gratuit → actif → période de grâce → expiré/suspendu → renouvellement, avec relances automatiques (dunning) et notifications.

Chaque transition de ces parcours déclenche une notification (Socket.io) et une entrée d'audit avec `etablissementId`.

## 6. Ce qui ne doit jamais être confondu

- **Isolation tenant** (un établissement ne voit jamais les données d'un autre) **≠** **contrôle clinique interne** (au sein d'un établissement, l'accès à un dossier est restreint au personnel en lien de soin + RBAC).
- **Flux de paiement abonnement** (établissement → plateforme) **≠** **flux de paiement soins** (patient → établissement).
- **Catalogue commercial** (`Plan`, prix, limites, modules) est **toujours en base**, jamais codé en dur.
