import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { TenantContextService } from '../tenant/tenant-context.service';

/**
 * Finalise (commit/rollback/release) la transaction RLS ouverte par TenantGuard — l'ouverture
 * elle-même (set_config app.current_tenant_id) se fait dans le guard, pas ici, pour que les
 * guards de route exécutés après (ex. CareContextGuard) voient déjà le contexte tenant positionné :
 * les guards s'exécutent tous avant les intercepteurs dans le pipeline Nest.
 * Référence : docs/phase-0/strategie-isolation.md §2 et tenant.guard.ts.
 */
@Injectable()
export class TenantRlsInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const queryRunner = this.tenantContext.getStore()?.queryRunner;

    if (!queryRunner) {
      return next.handle();
    }

    return next.handle().pipe(
      switchMap((result) =>
        from(queryRunner.commitTransaction()).pipe(
          map(() => {
            this.runAfterCommitCallbacks();
            return result;
          }),
        ),
      ),
      catchError((error) =>
        from(queryRunner.rollbackTransaction()).pipe(switchMap(() => throwError(() => error))),
      ),
      finalize(() => {
        this.tenantContext.set({ queryRunner: null, afterCommitCallbacks: [] });
        void queryRunner.release();
      }),
    );
  }

  private runAfterCommitCallbacks(): void {
    const callbacks = this.tenantContext.getStore()?.afterCommitCallbacks ?? [];
    for (const callback of callbacks) {
      callback();
    }
  }
}
