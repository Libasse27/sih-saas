import { Permission, PermissionEffect } from '@sih-saas/shared';

export interface PermissionOverride {
  permission: Permission;
  effect: PermissionEffect;
}

/**
 * permissions effectives = (somme des permissions des rôles) + ALLOW overrides − DENY overrides.
 * Référence : docs/phase-0/matrice-rbac.md §3.
 */
export function resolveEffectivePermissions(
  rolePermissions: Permission[],
  overrides: PermissionOverride[],
): Permission[] {
  const effective = new Set<Permission>(rolePermissions);

  for (const override of overrides) {
    if (override.effect === PermissionEffect.ALLOW) {
      effective.add(override.permission);
    } else {
      effective.delete(override.permission);
    }
  }

  return Array.from(effective);
}
