# Stratégie d'isolation multi-tenant et clinique — SIH SaaS

Deux niveaux d'accès, jamais confondus :
1. **Isolation tenant** : un établissement ne voit jamais les données d'un autre.
2. **Contrôle clinique interne** : au sein d'un établissement, l'accès au dossier d'un patient est restreint au personnel en lien de soin + RBAC granulaire, et journalisé.

L'isolation est **structurelle** (au niveau de la donnée), pas seulement appliquée dans les contrôleurs — un développeur qui oublie un `WHERE` ne doit pas pouvoir fuiter des données d'un autre établissement.

---

## 1. Contexte de requête — `AsyncLocalStorage`

`TenantContextService` (dans `SharedModule`) expose, pour toute la durée d'une requête HTTP ou d'un événement Socket.io :
```ts
interface RequestContext {
  userId: string;
  scope: 'PLATFORM' | 'ETABLISSEMENT' | 'PATIENT';
  etablissementId: string | null;
  roles: string[];
  permissions: string[];
}
```
Alimenté par un middleware Nest exécuté immédiatement après la validation du JWT (avant tout guard métier), via `AsyncLocalStorage.run(context, next)`. Tous les services/repositories lisent ce contexte via injection de `TenantContextService` — jamais besoin de faire transiter `etablissementId` en paramètre de méthode.

## 2. PostgreSQL — Row-Level Security (RLS)

Chaque table du schéma `clinic` :
```sql
ALTER TABLE clinic.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON clinic.patients
  USING (etablissement_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (etablissement_id = current_setting('app.current_tenant_id', true)::uuid);
```
- La policy s'applique aussi bien en lecture (`USING`) qu'en écriture (`WITH CHECK`) : impossible d'insérer une ligne pour un autre tenant.
- `current_setting(..., true)` renvoie `NULL` si la variable n'est pas définie → **aucune ligne visible par défaut**, fail-closed.

**Intégration TypeORM** : un `Interceptor` global (`TenantRlsInterceptor`) ouvre une transaction par requête métier via `QueryRunner` :
```ts
const queryRunner = dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();
await queryRunner.query(`SET LOCAL app.current_tenant_id = $1`, [tenantId]);
// ... exécution du use-case dans cette transaction ...
await queryRunner.commitTransaction();
```
`SET LOCAL` est borné à la transaction courante : aucune fuite possible entre requêtes même sur une connexion réutilisée par le pool.

**Périmètre `PLATFORM`** : les requêtes super-admin n'ouvrent pas cette transaction RLS (elles s'exécutent sur le schéma `platform`, non concerné par cette policy). Si un besoin cross-tenant ponctuel apparaît (ex. statistiques globales), il passe par une fonction Postgres `SECURITY DEFINER` explicite, jamais par un bypass généralisé.

## 3. MongoDB — plugin Mongoose tenant

Plugin global appliqué à tous les schémas cliniques (`DossierMedical`, etc.) :
- **Pre-save** : injecte automatiquement `etablissementId` depuis le `TenantContextService` à la création, refuse la modification de ce champ après coup.
- **Pre-find / pre-findOne / pre-update / pre-delete** : ajoute systématiquement `{ etablissementId: context.etablissementId }` au filtre, sauf si l'appelant a explicitement passé `{ bypassTenantScope: true }`.
- Cette option `bypassTenantScope` n'est utilisable que dans un repository qui vérifie au préalable `context.scope === 'PLATFORM'` (vérification redondante au niveau guard **et** repository — défense en profondeur).

## 4. Index composés

Sur toutes les tables/collections tenant : `{ etablissementId, <champ le plus recherché> }`. Exemples : `patients(etablissement_id, idh)`, `rendez_vous(etablissement_id, date_heure)`, `lits(etablissement_id, statut)`, `dossiers_medicaux{ etablissementId, patientId }`.

## 5. Contrôle clinique interne — `CareContextGuard`

Orthogonal à l'isolation tenant. S'applique sur toute route touchant au DME, aux prescriptions, aux résultats d'examen :
1. **`PermissionsGuard`** vérifie la permission RBAC statique (ex. `dossier:read`).
2. **`CareContextGuard`** vérifie ensuite qu'un **lien de soin actif** existe entre l'utilisateur et le patient ciblé : médecin référent de l'admission en cours, affectation au service où le patient est hospitalisé, intervention explicite (ex. prescripteur d'un examen), ou rôle administratif dont le périmètre exclut justement le contenu clinique (caissier, accueil — voir `matrice-rbac.md`).
3. Si l'une des deux vérifications échoue → `403`, **et l'échec est journalisé** dans `audit_logs` au même titre qu'un succès (`action: 'dossier.access.denied'`).

Un patient authentifié n'a accès qu'à son propre `patientId`, vérifié par un guard dédié (`SelfAccessGuard`) en plus du filtre `etablissementId`.

## 6. Journalisation systématique

Toute lecture ou écriture sur le DME, les prescriptions, les résultats, les admissions/sorties, et la facturation patient génère une entrée `audit_logs` avec `etablissementId`, `userId`, `ressource`, `ressourceId`, `ip`, `action`. Cette table est append-only.

## 7. Tests d'isolation obligatoires (dès la Phase 2)

- Un utilisateur de l'établissement A ne doit jamais pouvoir lire/écrire une ressource de l'établissement B (toutes entités cliniques + DME), même en forçant un ID dans l'URL.
- Un soignant de l'établissement A sans lien de soin avec un patient de A ne doit pas pouvoir lire son dossier (`CareContextGuard`).
- Un patient ne doit accéder qu'à ses propres données.
- Le `SUPER_ADMIN` ne doit jamais pouvoir lire le contenu clinique d'un DME (seulement les métadonnées d'usage/abonnement).
- Vérifier qu'une tentative d'`INSERT` avec un `etablissement_id` falsifié est bloquée par la policy RLS (`WITH CHECK`), pas seulement par la couche applicative.
