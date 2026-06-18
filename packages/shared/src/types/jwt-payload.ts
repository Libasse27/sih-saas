import { Scope } from '../enums/scope.enum';
import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

// Référence : prompt maître §10.1 — JWT { userId, scope, etablissementId, roles, permissions }
export interface JwtPayload {
  sub: string; // userId
  scope: Scope;
  etablissementId: string | null;
  roles: Role[];
  permissions: Permission[];
}
