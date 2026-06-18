import { SetMetadata } from '@nestjs/common';
import { Permission } from '@sih-saas/shared';

export const PERMISSIONS_KEY = 'permissions';

/** Exige que l'utilisateur courant possède toutes les permissions listées. */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
