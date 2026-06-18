import { AsyncLocalStorage } from 'async_hooks';
import { Permission, Role, Scope } from '@sih-saas/shared';
import { QueryRunner } from 'typeorm';

/**
 * Contexte porté par AsyncLocalStorage pour toute la durée d'une requête.
 * Référence : docs/phase-0/strategie-isolation.md §1.
 *
 * Singleton volontairement en dehors de la DI Nest : le plugin Mongoose (tenant.plugin.ts)
 * s'exécute dans des hooks Mongoose qui n'ont pas accès au conteneur Nest, il a donc besoin
 * d'importer directement cette instance plutôt que de la recevoir par injection.
 */
export interface TenantContextStore {
  userId: string | null;
  scope: Scope | null;
  etablissementId: string | null;
  roles: Role[];
  permissions: Permission[];
  /** Transaction Postgres ouverte par TenantRlsInterceptor pour la requête courante (RLS). */
  queryRunner: QueryRunner | null;
  /**
   * Callbacks à exécuter une fois la transaction RLS commitée (ex. émission Socket.io après
   * un changement de statut de lit) — jamais exécutés en cas de rollback. Voir TenantContextService.afterCommit().
   */
  afterCommitCallbacks: Array<() => void>;
}

export function emptyTenantContext(): TenantContextStore {
  return {
    userId: null,
    scope: null,
    etablissementId: null,
    roles: [],
    permissions: [],
    queryRunner: null,
    afterCommitCallbacks: [],
  };
}

export const tenantAls = new AsyncLocalStorage<TenantContextStore>();
