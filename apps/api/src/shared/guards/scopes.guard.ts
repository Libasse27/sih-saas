import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload, Scope } from '@sih-saas/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SCOPES_KEY } from '../decorators/scopes.decorator';

/**
 * RBAC de base (Phase 1) : vérifie le périmètre (scope) du token contre celui requis par la route.
 * Le contrôle clinique fin (CareContextGuard) et l'isolation tenant structurelle (TenantGuard)
 * arrivent en Phase 2/5 — voir docs/phase-0/strategie-isolation.md.
 */
@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredScopes = this.reflector.getAllAndOverride<Scope[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const user: JwtPayload = context.switchToHttp().getRequest().user;
    if (!user || !requiredScopes.includes(user.scope)) {
      throw new ForbiddenException('Accès refusé : périmètre insuffisant pour cette ressource.');
    }
    return true;
  }
}
