import { Permission, PermissionEffect } from '@sih-saas/shared';
import { resolveEffectivePermissions } from './permission-resolver';

describe('resolveEffectivePermissions', () => {
  it('retourne les permissions de rôle telles quelles en l’absence d’override', () => {
    const result = resolveEffectivePermissions([Permission.DOSSIER_READ, Permission.RDV_CREATE], []);

    expect(result).toEqual(expect.arrayContaining([Permission.DOSSIER_READ, Permission.RDV_CREATE]));
    expect(result).toHaveLength(2);
  });

  it('ajoute une permission via un override ALLOW', () => {
    const result = resolveEffectivePermissions(
      [Permission.DOSSIER_READ],
      [{ permission: Permission.PRESCRIPTION_CREATE, effect: PermissionEffect.ALLOW }],
    );

    expect(result).toEqual(expect.arrayContaining([Permission.DOSSIER_READ, Permission.PRESCRIPTION_CREATE]));
  });

  it('retire une permission de rôle via un override DENY', () => {
    const result = resolveEffectivePermissions(
      [Permission.DOSSIER_READ, Permission.DOSSIER_WRITE],
      [{ permission: Permission.DOSSIER_WRITE, effect: PermissionEffect.DENY }],
    );

    expect(result).toEqual([Permission.DOSSIER_READ]);
  });
});
