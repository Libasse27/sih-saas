import { ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, Role, Scope } from '@sih-saas/shared';
import { TenantGuard } from './tenant.guard';

describe('TenantGuard', () => {
  function buildContext(user: unknown): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  function buildReflector(isPublic: boolean): Reflector {
    return { getAllAndOverride: jest.fn(() => isPublic) } as unknown as Reflector;
  }

  it('laisse passer les routes publiques sans toucher au contexte', () => {
    const tenantContext = { set: jest.fn() };
    const guard = new TenantGuard(buildReflector(true), tenantContext as any);

    expect(guard.canActivate(buildContext(undefined))).toBe(true);
    expect(tenantContext.set).not.toHaveBeenCalled();
  });

  it('rejette un jeton ETABLISSEMENT incohérent (sans etablissementId)', () => {
    const tenantContext = { set: jest.fn() };
    const guard = new TenantGuard(buildReflector(false), tenantContext as any);
    const user = {
      sub: 'u1',
      scope: Scope.ETABLISSEMENT,
      etablissementId: null,
      roles: [Role.MEDECIN],
      permissions: [Permission.DOSSIER_READ],
    };

    expect(() => guard.canActivate(buildContext(user))).toThrow(InternalServerErrorException);
  });

  it('peuple le contexte tenant pour un utilisateur ETABLISSEMENT valide', () => {
    const tenantContext = { set: jest.fn() };
    const guard = new TenantGuard(buildReflector(false), tenantContext as any);
    const user = {
      sub: 'u1',
      scope: Scope.ETABLISSEMENT,
      etablissementId: 'etab-1',
      roles: [Role.MEDECIN],
      permissions: [Permission.DOSSIER_READ],
    };

    expect(guard.canActivate(buildContext(user))).toBe(true);
    expect(tenantContext.set).toHaveBeenCalledWith({
      userId: 'u1',
      scope: Scope.ETABLISSEMENT,
      etablissementId: 'etab-1',
      roles: [Role.MEDECIN],
      permissions: [Permission.DOSSIER_READ],
    });
  });

  it('un utilisateur PLATFORM (etablissementId=null) est autorisé', () => {
    const tenantContext = { set: jest.fn() };
    const guard = new TenantGuard(buildReflector(false), tenantContext as any);
    const user = {
      sub: 'u1',
      scope: Scope.PLATFORM,
      etablissementId: null,
      roles: [Role.SUPER_ADMIN],
      permissions: [Permission.ETABLISSEMENT_MANAGE],
    };

    expect(guard.canActivate(buildContext(user))).toBe(true);
    expect(tenantContext.set).toHaveBeenCalledWith(
      expect.objectContaining({ scope: Scope.PLATFORM, etablissementId: null }),
    );
  });
});
