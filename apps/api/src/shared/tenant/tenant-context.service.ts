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

  /**
   * Exécute `callback` comme si une requête HTTP authentifiée ETABLISSEMENT avait ouvert ce
   * contexte (TenantGuard) — pour du code appelé hors pipeline HTTP standard mais devant néanmoins
   * écrire dans des tables `clinic.*` protégées par RLS (Phase 32 : ProvisioningService, appelé
   * depuis des routes `@Public()` — register, webhook paiement — où TenantGuard ne s'exécute jamais).
   * Ouvre puis referme sa PROPRE transaction et restaure l'état précédent du contexte dans le
   * `finally`, pour ne jamais interférer avec ce que `TenantRlsInterceptor` gère normalement à la
   * fin de la requête HTTP en cours (qui peut très bien n'avoir aucune transaction du tout, cas
   * `@Public()`, ou — en théorie — déjà la sienne si jamais appelé depuis un contexte authentifié).
   */
  async runForEtablissement<T>(etablissementId: string, callback: () => Promise<T>): Promise<T> {
    const store = this.getStore();
    if (!store) {
      throw new Error(
        'runForEtablissement() appelé hors contexte de requête : TenantContextMiddleware est-il bien appliqué ?',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);

    const precedent = { etablissementId: store.etablissementId, queryRunner: store.queryRunner };
    Object.assign(store, { etablissementId, queryRunner });

    try {
      const resultat = await callback();
      await queryRunner.commitTransaction();
      return resultat;
    } catch (erreur) {
      await queryRunner.rollbackTransaction();
      throw erreur;
    } finally {
      Object.assign(store, precedent);
      await queryRunner.release();
    }
  }
}
