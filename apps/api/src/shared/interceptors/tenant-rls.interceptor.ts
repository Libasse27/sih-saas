import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Scope } from '@sih-saas/shared';
import { Observable, from, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { DataSource } from 'typeorm';
import { TenantContextService } from '../tenant/tenant-context.service';

/**
 * Ouvre une transaction Postgres par requête et y positionne app.current_tenant_id
 * (lu par les policies RLS via current_setting) pour tout appelant ETABLISSEMENT/PATIENT.
 * PLATFORM n'opère que sur le schéma `platform` (sans RLS) et n'a donc pas besoin de cette transaction.
 * Référence : docs/phase-0/strategie-isolation.md §2.
 */
@Injectable()
export class TenantRlsInterceptor implements NestInterceptor {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  async intercept(_context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const store = this.tenantContext.getStore();

    if (!store || (store.scope !== Scope.ETABLISSEMENT && store.scope !== Scope.PATIENT)) {
      return next.handle();
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    // set_config(..., true) = portée LOCAL à la transaction, équivalent à SET LOCAL mais paramétrable.
    await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [
      store.etablissementId,
    ]);
    this.tenantContext.set({ queryRunner });

    return next.handle().pipe(
      switchMap((result) => from(queryRunner.commitTransaction()).pipe(map(() => result))),
      catchError((error) =>
        from(queryRunner.rollbackTransaction()).pipe(switchMap(() => throwError(() => error))),
      ),
      finalize(() => {
        this.tenantContext.set({ queryRunner: null });
        void queryRunner.release();
      }),
    );
  }
}
