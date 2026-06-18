import { CanActivate, ExecutionContext, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload, Scope } from '@sih-saas/shared';
import { TenantContextService } from '../tenant/tenant-context.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Résout etablissementId/scope/permissions dans le contexte AsyncLocalStorage de la requête.
 * S'exécute juste après JwtAuthGuard (req.user déjà peuplé) et avant ScopesGuard/PermissionsGuard.
 * Référence : docs/phase-0/architecture-modules-nestjs.md §3.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
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

    return true;
  }
}
