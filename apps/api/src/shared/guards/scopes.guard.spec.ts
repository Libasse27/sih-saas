import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Scope } from '@sih-saas/shared';
import { ScopesGuard } from './scopes.guard';

describe('ScopesGuard', () => {
  function buildContext(user: unknown): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  function buildReflector(scopes: Scope[] | undefined, isPublic = false): Reflector {
    return {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === 'isPublic') return isPublic;
        if (key === 'scopes') return scopes;
        return undefined;
      }),
    } as unknown as Reflector;
  }

  it('bloque un utilisateur ETABLISSEMENT (ex. MEDECIN) sur une route réservée à PLATFORM', () => {
    const reflector = buildReflector([Scope.PLATFORM]);
    const guard = new ScopesGuard(reflector);
    const context = buildContext({ scope: Scope.ETABLISSEMENT, roles: ['MEDECIN'] });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('autorise un SUPER_ADMIN (scope PLATFORM) sur une route réservée à PLATFORM', () => {
    const reflector = buildReflector([Scope.PLATFORM]);
    const guard = new ScopesGuard(reflector);
    const context = buildContext({ scope: Scope.PLATFORM, roles: ['SUPER_ADMIN'] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('autorise toute requête si aucun scope n’est requis sur la route', () => {
    const reflector = buildReflector(undefined);
    const guard = new ScopesGuard(reflector);
    const context = buildContext({ scope: Scope.ETABLISSEMENT });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('laisse passer les routes publiques sans vérifier le scope', () => {
    const reflector = buildReflector([Scope.PLATFORM], true);
    const guard = new ScopesGuard(reflector);
    const context = buildContext(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });
});
