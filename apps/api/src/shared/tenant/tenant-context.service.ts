import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Permission, Role, Scope } from '@sih-saas/shared';
import { DataSource, EntityManager } from 'typeorm';
import { emptyTenantContext, tenantAls, TenantContextStore } from './tenant-context.storage';

/**
 * Façade injectable autour de l'AsyncLocalStorage partagé (tenant-context.storage.ts).
 * Référence : docs/phase-0/strategie-isolation.md §1.
 */
@Injectable()
export class TenantContextService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Ouvre un nouveau scope de contexte (appelé une fois par requête par TenantContextMiddleware). */
  run<T>(callback: () => T): T {
    return tenantAls.run(emptyTenantContext(), callback);
  }

  getStore(): TenantContextStore | undefined {
    return tenantAls.getStore();
  }

  /** Met à jour le contexte courant (ex. TenantGuard après authentification, TenantRlsInterceptor pour le queryRunner). */
  set(partial: Partial<TenantContextStore>): void {
    const store = tenantAls.getStore();
    if (!store) {
      throw new Error(
        'TenantContextService.set() appelé hors contexte de requête : TenantContextMiddleware est-il bien appliqué ?',
      );
    }
    Object.assign(store, partial);
  }

  getUserId(): string | null {
    return this.getStore()?.userId ?? null;
  }

  getScope(): Scope | null {
    return this.getStore()?.scope ?? null;
  }

  getEtablissementId(): string | null {
    return this.getStore()?.etablissementId ?? null;
  }

  getRoles(): Role[] {
    return this.getStore()?.roles ?? [];
  }

  getPermissions(): Permission[] {
    return this.getStore()?.permissions ?? [];
  }

  /**
   * Enregistre un callback exécuté uniquement après le commit réussi de la transaction RLS en
   * cours (par TenantRlsInterceptor) — jamais en cas de rollback. Sert aux effets de bord non
   * transactionnels qui ne doivent refléter que des écritures réellement persistées (ex. émission
   * Socket.io « lit occupé »). Hors contexte de requête (pas de transaction ouverte), exécute
   * immédiatement : c'est le cas pour le scope PLATFORM, qui n'ouvre pas de transaction RLS.
   */
  afterCommit(callback: () => void): void {
    const store = this.getStore();
    if (!store?.queryRunner) {
      callback();
      return;
    }
    store.afterCommitCallbacks.push(callback);
  }

  /**
   * EntityManager à utiliser par les futurs repositories de modules cliniques (Phase 5+) :
   * celui de la transaction RLS en cours s'il y en a une, sinon le manager par défaut.
   */
  getManager(): EntityManager {
    const queryRunner = this.getStore()?.queryRunner;
    return queryRunner ? queryRunner.manager : this.dataSource.manager;
  }
}
