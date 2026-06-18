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

  function buildDataSource(queryRunner: any) {
    return { createQueryRunner: jest.fn(() => queryRunner) };
  }

  function buildQueryRunner() {
    return {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn(),
    };
  }

  it('laisse passer les routes publiques sans toucher au contexte', async () => {
    const tenantContext = { set: jest.fn() };
    const queryRunner = buildQueryRunner();
    const guard = new TenantGuard(buildReflector(true), tenantContext as any, buildDataSource(queryRunner) as any);

    await expect(guard.canActivate(buildContext(undefined))).resolves.toBe(true);
    expect(tenantContext.set).not.toHaveBeenCalled();
    expect(queryRunner.connect).not.toHaveBeenCalled();
  });

  it('rejette un jeton ETABLISSEMENT incohérent (sans etablissementId)', async () => {
    const tenantContext = { set: jest.fn() };
    const queryRunner = buildQueryRunner();
    const guard = new TenantGuard(buildReflector(false), tenantContext as any, buildDataSource(queryRunner) as any);
    const user = {
      sub: 'u1',
      scope: Scope.ETABLISSEMENT,
      etablissementId: null,
      roles: [Role.MEDECIN],
      permissions: [Permission.DOSSIER_READ],
    };

    await expect(guard.canActivate(buildContext(user))).rejects.toThrow(InternalServerErrorException);
  });

  it('peuple le contexte tenant et ouvre la transaction RLS pour un utilisateur ETABLISSEMENT valide', async () => {
    const tenantContext = { set: jest.fn() };
    const queryRunner = buildQueryRunner();
    const guard = new TenantGuard(buildReflector(false), tenantContext as any, buildDataSource(queryRunner) as any);
    const user = {
      sub: 'u1',
      scope: Scope.ETABLISSEMENT,
      etablissementId: 'etab-1',
      roles: [Role.MEDECIN],
      permissions: [Permission.DOSSIER_READ],
    };

    await expect(guard.canActivate(buildContext(user))).resolves.toBe(true);

    expect(tenantContext.set).toHaveBeenCalledWith({
      userId: 'u1',
      scope: Scope.ETABLISSEMENT,
      etablissementId: 'etab-1',
      roles: [Role.MEDECIN],
      permissions: [Permission.DOSSIER_READ],
    });
    // La transaction RLS doit être ouverte AVANT que tout guard de route (ex. CareContextGuard) ne s'exécute.
    expect(queryRunner.connect).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining('set_config'), ['etab-1']);
    expect(tenantContext.set).toHaveBeenCalledWith({ queryRunner });
  });

  it('un utilisateur PLATFORM (etablissementId=null) est autorisé sans ouvrir de transaction RLS', async () => {
    const tenantContext = { set: jest.fn() };
    const queryRunner = buildQueryRunner();
    const guard = new TenantGuard(buildReflector(false), tenantContext as any, buildDataSource(queryRunner) as any);
    const user = {
      sub: 'u1',
      scope: Scope.PLATFORM,
      etablissementId: null,
      roles: [Role.SUPER_ADMIN],
      permissions: [Permission.ETABLISSEMENT_MANAGE],
    };

    await expect(guard.canActivate(buildContext(user))).resolves.toBe(true);
    expect(tenantContext.set).toHaveBeenCalledWith(
      expect.objectContaining({ scope: Scope.PLATFORM, etablissementId: null }),
    );
    expect(queryRunner.connect).not.toHaveBeenCalled();
  });
});
