import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EtablissementStatut, Scope } from '@sih-saas/shared';
import { SubscriptionStatusGuard } from './subscription-status.guard';

describe('SubscriptionStatusGuard', () => {
  let etablissementsService: { findById: jest.Mock };

  function buildContext(user: unknown): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  function buildReflector(isPublic = false, allowInactive = false): Reflector {
    return {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === 'isPublic') return isPublic;
        if (key === 'allowSubscriptionInactive') return allowInactive;
        return undefined;
      }),
    } as unknown as Reflector;
  }

  beforeEach(() => {
    etablissementsService = { findById: jest.fn() };
  });

  it('bloque un utilisateur ETABLISSEMENT dont l’établissement est EXPIRE', async () => {
    etablissementsService.findById.mockResolvedValue({ statut: EtablissementStatut.EXPIRE });
    const guard = new SubscriptionStatusGuard(buildReflector(), etablissementsService as any);
    const context = buildContext({ scope: Scope.ETABLISSEMENT, etablissementId: 'etab-1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('bloque un utilisateur ETABLISSEMENT dont l’établissement est SUSPENDU', async () => {
    etablissementsService.findById.mockResolvedValue({ statut: EtablissementStatut.SUSPENDU });
    const guard = new SubscriptionStatusGuard(buildReflector(), etablissementsService as any);
    const context = buildContext({ scope: Scope.ETABLISSEMENT, etablissementId: 'etab-1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('autorise un utilisateur ETABLISSEMENT dont l’établissement est ACTIF', async () => {
    etablissementsService.findById.mockResolvedValue({ statut: EtablissementStatut.ACTIF });
    const guard = new SubscriptionStatusGuard(buildReflector(), etablissementsService as any);
    const context = buildContext({ scope: Scope.ETABLISSEMENT, etablissementId: 'etab-1' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('ne vérifie jamais le statut pour un PATIENT, même si son établissement est SUSPENDU', async () => {
    const guard = new SubscriptionStatusGuard(buildReflector(), etablissementsService as any);
    const context = buildContext({ scope: Scope.PATIENT, etablissementId: 'etab-1' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(etablissementsService.findById).not.toHaveBeenCalled();
  });

  it('ne vérifie jamais le statut pour PLATFORM (pas d’etablissementId)', async () => {
    const guard = new SubscriptionStatusGuard(buildReflector(), etablissementsService as any);
    const context = buildContext({ scope: Scope.PLATFORM });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(etablissementsService.findById).not.toHaveBeenCalled();
  });

  it('laisse passer une route publique sans vérifier le statut', async () => {
    const guard = new SubscriptionStatusGuard(buildReflector(true), etablissementsService as any);
    const context = buildContext(undefined);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(etablissementsService.findById).not.toHaveBeenCalled();
  });

  it('laisse passer une route @AllowSubscriptionInactive même si EXPIRE', async () => {
    const guard = new SubscriptionStatusGuard(buildReflector(false, true), etablissementsService as any);
    const context = buildContext({ scope: Scope.ETABLISSEMENT, etablissementId: 'etab-1' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(etablissementsService.findById).not.toHaveBeenCalled();
  });
});
