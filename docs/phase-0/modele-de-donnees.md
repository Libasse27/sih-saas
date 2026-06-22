# Modèle de données — SIH SaaS Multi-Établissements

Convention : PK `uuid` (v4) partout. Toute table/collection "clinique" porte un `etablissementId` **NOT NULL**, indexé seul et en composite avec les champs les plus recherchés. ORM PostgreSQL : **TypeORM**. ODM MongoDB : **Mongoose**.

> Rappel de la règle de séparation : `invoices`/`payments`/`subscriptions` (abonnement établissement→plateforme) ne partagent **aucun** modèle, endpoint ni reporting avec `factures_patient`/`paiements_patient` (soins patient→établissement).

---

## 1. PostgreSQL — schéma `platform`

Pas de RLS sur ce schéma : l'accès est contrôlé par guard applicatif (`scope === 'PLATFORM'`), sauf `users` qui est lu en partie par tous les scopes (table partagée, RLS désactivée mais requêtes toujours filtrées par `id` ou `etablissementId` applicatif).

### `users`
| Champ | Type | Notes |
|---|---|---|
| id | uuid PK | |
| scope | enum(`PLATFORM`,`ETABLISSEMENT`,`PATIENT`) | |
| etablissement_id | uuid FK nullable | `null` ssi `scope = PLATFORM` |
| nom, prenom | varchar | |
| email | varchar unique | |
| telephone | varchar | format `+221XXXXXXXXX` validé |
| password_hash | varchar | bcrypt, 12 rounds |
| mfa_enabled | boolean | |
| mfa_secret | varchar nullable | chiffré au repos |
| dernier_login | timestamptz | |
| tentatives_echouees | int default 0 | anti-bruteforce |
| verrouille_jusqua | timestamptz nullable | |
| created_at, updated_at, deleted_at | timestamptz | soft delete |

### `roles` (enum table) / `role_permissions`
- `role_permissions(role varchar, permission varchar)` — table de jointure éditable en base (CRUD super-admin), source de vérité du RBAC statique par rôle.
- `user_permissions(user_id FK, permission varchar, effect enum(ALLOW,DENY))` — overrides ponctuels par utilisateur, appliqués après les permissions de rôle.
- `user_roles(user_id FK, role varchar)` — un utilisateur peut porter plusieurs rôles (ex. `MEDECIN` + `DIRECTEUR`).

### `etablissements`
| Champ | Type | Notes |
|---|---|---|
| id | uuid PK | = tenant id |
| nom | varchar | |
| type | enum(`HOPITAL`,`CLINIQUE`) | |
| rccm, ninea | varchar | identifiants légaux Sénégal |
| adresse, ville, pays | varchar | pays default `Sénégal` |
| telephone, email, logo | varchar | |
| devise | varchar default `XOF` | |
| langue | varchar default `fr-SN` | |
| fuseau | varchar default `Africa/Dakar` | |
| admin_id | uuid FK users | créateur = `ADMIN_ETABLISSEMENT` |
| abonnement_actif_id | uuid FK subscriptions nullable | |
| statut | enum(`ACTIF`,`SUSPENDU`,`EXPIRE`,`EN_ATTENTE_PAIEMENT`,`ESSAI`) | |
| usage | jsonb `{utilisateurs, lits, stockageMo}` | recalculé périodiquement, comparé aux `limites` du `planSnapshot` |
| created_at, updated_at, deleted_at | timestamptz | |

### `plans`
| Champ | Type |
|---|---|
| id | uuid PK |
| code | varchar unique |
| nom, description | varchar/text |
| tarifs | jsonb `{mensuel, annuel, devise:'XOF'}` |
| limites | jsonb `{maxUtilisateurs, maxLits, maxStockageMo}` (`-1` = illimité) |
| modules | text[] (`DME`,`RDV`,`ADMISSIONS`,`PHARMACIE`,`LABORATOIRE`,`IMAGERIE`,`FACTURATION`,`TELEMEDECINE`,`API`) |
| features | jsonb `{supportPrioritaire, apiAccess, multiSites}` |
| essai_gratuit_jours | int default 0 |
| visible, actif | boolean |
| ordre_affichage | int |
| version | int default 1, incrémenté à chaque modification significative |

### `subscriptions`
| Champ | Type | Notes |
|---|---|---|
| id | uuid PK | |
| etablissement_id | uuid FK | |
| plan_id | uuid FK | |
| plan_snapshot | jsonb | **copie figée** du `Plan` au moment de la souscription — toutes les vérifications de feature/limite lisent ce champ, jamais `plans` directement (grandfathering) |
| periodicite | enum(`MENSUEL`,`ANNUEL`) | |
| date_debut, date_fin | timestamptz | |
| statut | enum(`ESSAI`,`ACTIF`,`EN_PERIODE_GRACE`,`EXPIRE`,`SUSPENDU`,`ANNULE`,`EN_ATTENTE`) | |
| montant, devise | numeric/varchar | |
| renouvellement_auto | boolean | |
| coupon_applique | varchar nullable | |
| historique | jsonb[] | trace des changements de statut/plan |

### `payments` (abonnement)
`id, etablissement_id, subscription_id, provider enum(STRIPE,WAVE,ORANGE_MONEY,CARTE), reference unique, montant, devise, statut enum(EN_ATTENTE,REUSSI,ECHOUE), raw_payload jsonb, created_at`

### `invoices` (abonnement)
`id, etablissement_id, subscription_id, numero unique, montant_ht, tva, montant_ttc, statut, pdf_url, emise_le, echeance_le`

### `transactions`
Grand livre reliant `payments` ↔ `invoices` : `id, type, payment_id, invoice_id, montant, sens(DEBIT/CREDIT), created_at`.

### `coupons` / `promotions`
`coupons(id, code unique, type enum(POURCENTAGE,MONTANT_FIXE), valeur, plans_eligibles uuid[], usage_max, usage_actuel, valide_du, valide_au, actif)`
`promotions(id, nom, description, regle jsonb, periode)`

### `audit_logs`
`id, etablissement_id nullable (null = action plateforme), user_id, action varchar, ressource varchar, ressource_id uuid, ip varchar, user_agent varchar, metadata jsonb, created_at`
**Append-only** (pas d'UPDATE/DELETE applicatif), partitionnable par mois pour la performance et la rétention légale.

### `settings`
`id, cle unique, valeur jsonb (secrets chiffrés via KMS/vault — jamais en clair), description, updated_at`

---

## 2. PostgreSQL — schéma `clinic` (RLS active, voir `strategie-isolation.md`)

Toutes les tables ci-dessous ont `etablissement_id uuid NOT NULL` + index composite `{etablissement_id, <champ clé>}`.

| Table | Champs clés |
|---|---|
| `patients` | idh (unique par établissement, format `{CODE_ETAB}-{ANNEE}-{SEQUENCE}`, ex. `HMS-2026-000123`), nom, prenom, date_naissance, sexe, telephone (+221), adresse, assurance_id FK nullable, contact_urgence jsonb, consentements jsonb[] `{type, date, valeur}` |
| `sites` | (Phase 34, `Plan.features.multiSites`) nom, code (unique par établissement), adresse, ville, telephone — site physique/succursale ; un établissement sans `multiSites` dans son forfait actif est plafonné à 1 site (`SubscriptionsService.assertMultiSitesAutorise`) |
| `services` | site_id FK sites, nom, code, type, responsable_id FK users |
| `chambres` | service_id FK, site_id FK sites (dénormalisé depuis le service), numero, type |
| `lits` | chambre_id FK, service_id FK (dénormalisé), site_id FK sites (dénormalisé depuis la chambre), numero, statut enum(`LIBRE`,`OCCUPE`,`RESERVE`,`MAINTENANCE`), patient_actuel_id FK nullable |
| `admissions` | patient_id FK, lit_id FK, service_id FK, medecin_referent_id FK users, motif, date_admission, date_sortie_prevue, date_sortie_reelle, statut |
| `mouvements_patient` | patient_id FK, admission_id FK, type enum(`ENTREE`,`TRANSFERT`,`SORTIE`), service/lit origine+destination, date_mouvement, effectue_par FK users |
| `rendez_vous` | patient_id FK, praticien_id FK users, service_id FK, date_heure, duree_min, motif, statut, canal(`SUR_SITE`,`TELECONSULTATION`) |
| `consultations` | patient_id FK, praticien_id FK users, rendez_vous_id FK nullable, admission_id FK nullable, date, motif, examen_clinique text, diagnostic_cim10, conclusion, dossier_medical_ref (id du document Mongo) |
| `prescriptions` + `prescription_lignes` | patient_id FK, consultation_id FK, prescripteur_id FK users, date, statut / lignes : medicament_id, posologie, duree, voie |
| `medicaments_catalogue` | **référentiel global, non tenant** : DCI, code ATC, forme, dosage |
| `stock_medicament` | medicament_id FK catalogue, lot, quantite, seuil_alerte, date_expiration, emplacement |
| `administration_medicament` | prescription_ligne_id FK, patient_id FK, infirmier_id FK users, date_heure, statut(`ADMINISTRE`,`REFUSE`,`OMIS`), commentaire |
| `dispensations` | prescription_id FK, pharmacien_id FK users, date, lignes_dispensees jsonb |
| `demandes_analyse` | patient_id FK, prescripteur_id FK, type_analyse, urgence boolean, statut, date_demande |
| `resultats_analyse` | demande_id FK, biologiste_id FK, resultats jsonb, valeurs_critiques boolean, date_validation, fichier_url |
| `demandes_imagerie` | patient_id FK, prescripteur_id FK, type_examen, urgence, statut, date_demande |
| `comptes_rendus_imagerie` | demande_id FK, radiologue_id FK, conclusion, fichier_dicom_url, date_validation |
| `factures_patient` | patient_id FK, admission_id FK nullable, numero, lignes jsonb[] `{libelle, quantite, prix_unitaire}`, montant_total, part_assurance, part_patient, statut(`EN_ATTENTE`,`PARTIELLEMENT_PAYEE`,`PAYEE`,`ANNULEE`), date_emission |
| `paiements_patient` | facture_patient_id FK, montant, mode(`CAISSE`,`ORANGE_MONEY`,`WAVE`,`CARTE`), reference, statut, caissier_id FK users nullable, date |
| `assurances` | patient_id FK, organisme(`IPM`,`MUTUELLE`,`CMU`,`PRIVEE`), numero_police, taux_couverture, valide_du, valide_au |

---

## 3. MongoDB — documents riches

### `dossiers_medicaux`
```js
{
  _id, patientId, etablissementId,        // etablissementId indexé, filtré par plugin tenant
  antecedents: {
    medicaux: [...], chirurgicaux: [...], familiaux: [...],
    allergies: [{ substance, severite, dateConstatee }]
  },
  observations: [{ date, auteurId, contenu, type }],
  comptesRendus: [{ date, auteurId, type, contenu, fichierUrl }],
  courriers: [{ date, destinataire, contenu, fichierUrl }],
  piecesJointes: [{ url, urlSigneeExpirante, type, dateUpload, uploadePar }],
  historiqueAccesRapide: [{ userId, date, action }],  // sous-journal local ; AuditLog reste la source de vérité
  createdAt, updatedAt
}
```
Index : `{ etablissementId: 1, patientId: 1 }` (unique logique : un dossier par patient).

### `documents_cliniques` (optionnel, Phase 5+ si besoin de perf)
Sépare les pièces jointes volumineuses (DICOM, PDF) du document `dossiers_medicaux` principal pour accélérer sa lecture. Même indexation `{ etablissementId, patientId }`.

---

## 4. Schéma relationnel simplifié (vue d'ensemble)

```
Etablissement (1) ── (1) Subscription ── (1) Plan
       │                                    (planSnapshot figé dans Subscription)
       ├── (N) User
       ├── (N) Site (Phase 34, multiSites)
       ├── (N) Patient ── (1) DossierMedical [Mongo]
       │        ├── (N) Admission ── (1) Lit ── (1) Chambre ── (1) Service ── (1) Site
       │        ├── (N) RendezVous / Consultation
       │        ├── (N) Prescription ── (N) PrescriptionLigne ── (1) Medicament
       │        ├── (N) DemandeAnalyse / DemandeImagerie
       │        ├── (N) FacturePatient ── (N) PaiementPatient
       │        └── (N) Assurance
       └── (N) AuditLog
```
