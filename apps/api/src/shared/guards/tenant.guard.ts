import { CanActivate, ExecutionContext, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { JwtPayload, Scope } from '@sih-saas/shared';
import { DataSource } from 'typeorm';
import { TenantContextService } from '../tenant/tenant-context.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Résout etablissementId/scope/permissions dans le contexte AsyncLocalStorage de la requête, ET
 * ouvre la transaction RLS (set_config app.current_tenant_id) pour ETABLISSEMENT/PATIENT.
 *
 * Important : cette ouverture doit se faire ICI (dans un GUARD), pas dans un intercepteur — les
 * guards s'exécutent TOUS avant les intercepteurs dans le pipeline Nest, y compris les guards
 * posés sur une route précise (ex. CareContextGuard). Si la transaction n'était ouverte que dans
 * un intercepteur, un guard de route comme CareContextGuard interrogerait encore la connexion par
 * défaut (sans contexte tenant positionné) et ne verrait aucune ligne (RLS fail-closed) même pour
 * un accès parfaitement légitime. TenantRlsInterceptor ne fait plus que commit/rollback/release.
 * Référence : docs/phase-0/architecture-modules-nestjs.md §3 et strategie-isolation.md §2.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;

    if (isPublic || !user) {
      return true;
    }

    if ((user.scope === Scope.ETABLISSEMENT || user.scope === Scope.PATIENT) && !user.etablissementId) {
      throw new InternalServerErrorException(
        "Jeton incohérent : etablissementId requis pour ce périmètre.",
      );
    }

    this.tenantContext.set({
      userId: user.sub,
      scope: user.scope,
      etablissementId: user.etablissementId,
      roles: user.roles,
      permissions: user.permissions,
    });

    if (user.scope === Scope.ETABLISSEMENT || user.scope === Scope.PATIENT) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      // set_config(..., true) = portée LOCAL à la transaction (voir TenantRlsInterceptor d'origine).
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [
        user.etablissementId,
      ]);
      this.tenantContext.set({ queryRunner });
    }

    return true;
  }
}
