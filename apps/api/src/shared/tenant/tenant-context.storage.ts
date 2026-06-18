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
}

export function emptyTenantContext(): TenantContextStore {
  return {
    userId: null,
    scope: null,
    etablissementId: null,
    roles: [],
    permissions: [],
    queryRunner: null,
  };
}

export const tenantAls = new AsyncLocalStorage<TenantContextStore>();
