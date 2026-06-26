import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanFeatures } from '@sih-saas/shared';
import { PlanFeatureFlagGuard } from './plan-feature-flag.guard';

describe('PlanFeatureFlagGuard', () => {
  function buildContext(user: unknown): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  function buildReflector(requiredFeature: keyof PlanFeatures | undefined): Reflector {
    return { getAllAndOverride: jest.fn(() => requiredFeature) } as unknown as Reflector;
  }

  it("laisse passer une route qui n'exige aucune feature particulière", async () => {
    const subscriptionsService = { hasFeature: jest.fn() };
    const guard = new PlanFeatureFlagGuard(buildReflector(undefined), subscriptionsService as any);

    await expect(guard.canActivate(buildContext({ etablissementId: 'etab-1' }))).resolves.toBe(true);
    expect(subscriptionsService.hasFeature).not.toHaveBeenCalled();
  });

  it('autorise si la feature est activée dans le planSnapshot actif', async () => {
    const subscriptionsService = { hasFeature: jest.fn().mockResolvedValue(true) };
    const guard = new PlanFeatureFlagGuard(buildReflector('apiAccess'), subscriptionsService as any);

    await expect(guard.canActivate(buildContext({ etablissementId: 'etab-1' }))).resolves.toBe(true);
    expect(subscriptionsService.hasFeature).toHaveBeenCalledWith('etab-1', 'apiAccess');
  });

  it("refuse si la feature n'est pas incluse dans le forfait", async () => {
    const subscriptionsService = { hasFeature: jest.fn().mockResolvedValue(false) };
    const guard = new PlanFeatureFlagGuard(buildReflector('apiAccess'), subscriptionsService as any);

    await expect(guard.canActivate(buildContext({ etablissementId: 'etab-1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
