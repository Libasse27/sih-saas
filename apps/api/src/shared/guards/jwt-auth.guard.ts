import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Scope } from '@sih-saas/shared';
import { ApiKeysService } from '../../modules/api-keys/application/api-keys.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Authentification par clé API (Phase 11, header `X-Api-Key`) — un système externe consommant du
 * FHIR n'a pas de compte utilisateur, donc pas de JWT. Posée AVANT toute autre logique : si le
 * header est présent, c'est le SEUL mécanisme d'authentification utilisé pour cette requête
 * (jamais de repli silencieux vers `@Public()`/JWT en cas de clé invalide — `request.user` doit
 * rester cohérent pour TenantGuard/ScopesGuard/PermissionsGuard/PlanFeatureGuard en aval, qui ne
 * savent pas distinguer une clé API d'un JWT : poser `request.user` au format `JwtPayload` exact
 * est ce qui leur permet de continuer à fonctionner sans aucune modification.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeysService: ApiKeysService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'];

    if (apiKeyHeader) {
      const apiKey = await this.apiKeysService.verifier(apiKeyHeader);
      if (!apiKey) {
        throw new UnauthorizedException('Clé API invalide, expirée ou révoquée.');
      }
      request.user = {
        sub: apiKey.id,
        scope: Scope.ETABLISSEMENT,
        etablissementId: apiKey.etablissementId,
        roles: [],
        permissions: apiKey.permissions,
        serviceId: null,
      };
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context) as Promise<boolean>;
  }
}
