import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, Scope } from '@sih-saas/shared';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard — authentification par clé API (Phase 11)', () => {
  let apiKeysService: { verifier: jest.Mock };
  let reflector: Reflector;

  function buildContext(headers: Record<string, string | undefined>, request: Record<string, unknown> = {}) {
    const req: any = { headers, ...request };
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    apiKeysService = { verifier: jest.fn() };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector;
  });

  it('pose request.user au format JwtPayload quand le header X-Api-Key est valide', async () => {
    apiKeysService.verifier.mockResolvedValue({
      id: 'key-1',
      etablissementId: 'etab-1',
      permissions: [Permission.FHIR_READ],
    });
    const guard = new JwtAuthGuard(reflector, apiKeysService as any);
    const context = buildContext({ 'x-api-key': 'sk_live_abc' });

    const resultat = await guard.canActivate(context);

    expect(resultat).toBe(true);
    expect((context.switchToHttp().getRequest() as any).user).toEqual({
      sub: 'key-1',
      scope: Scope.ETABLISSEMENT,
      etablissementId: 'etab-1',
      roles: [],
      permissions: [Permission.FHIR_READ],
      serviceId: null,
    });
  });

  it('rejette (401) un header X-Api-Key invalide sans jamais retomber sur le flux JWT/@Public()', async () => {
    apiKeysService.verifier.mockResolvedValue(null);
    const guard = new JwtAuthGuard(reflector, apiKeysService as any);
    const context = buildContext({ 'x-api-key': 'sk_live_invalide' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('laisse passer une route @Public() en l’absence de header X-Api-Key', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(true);
    const guard = new JwtAuthGuard(reflector, apiKeysService as any);
    const context = buildContext({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(apiKeysService.verifier).not.toHaveBeenCalled();
  });
});
