import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleMetier } from '@sih-saas/shared';
import { PlanFeatureGuard } from './plan-feature.guard';

describe('PlanFeatureGuard', () => {
  function buildContext(user: unknown): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  function buildReflector(requiredModule: ModuleMetier | undefined): Reflector {
    return { getAllAndOverride: jest.fn(() => requiredModule) } as unknown as Reflector;
  }

  it("laisse passer une route qui n'exige aucun module particulier", async () => {
    const subscriptionsService = { hasModule: jest.fn() };
    const guard = new PlanFeatureGuard(buildReflector(undefined), subscriptionsService as any);

    await expect(guard.canActivate(buildContext({ etablissementId: 'etab-1' }))).resolves.toBe(true);
    expect(subscriptionsService.hasModule).not.toHaveBeenCalled();
  });

  it('autorise si le module est inclus dans le planSnapshot actif', async () => {
    const subscriptionsService = { hasModule: jest.fn().mockResolvedValue(true) };
    const guard = new PlanFeatureGuard(buildReflector(ModuleMetier.IMAGERIE_MEDICALE), subscriptionsService as any);

    await expect(guard.canActivate(buildContext({ etablissementId: 'etab-1' }))).resolves.toBe(true);
    expect(subscriptionsService.hasModule).toHaveBeenCalledWith('etab-1', ModuleMetier.IMAGERIE_MEDICALE);
  });

  it("refuse si le module n'est pas inclus dans le forfait", async () => {
    const subscriptionsService = { hasModule: jest.fn().mockResolvedValue(false) };
    const guard = new PlanFeatureGuard(buildReflector(ModuleMetier.IMAGERIE_MEDICALE), subscriptionsService as any);

    await expect(guard.canActivate(buildContext({ etablissementId: 'etab-1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
