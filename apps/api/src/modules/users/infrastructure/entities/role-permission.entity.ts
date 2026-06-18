import { Permission, Role } from '@sih-saas/shared';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Table éditable sans redéploiement (docs/phase-0/matrice-rbac.md) — seedée par rbac.seed.ts. */
@Entity({ schema: 'platform', name: 'role_permissions' })
@Index(['role', 'permission'], { unique: true })
export class RolePermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ type: 'enum', enum: Permission })
  permission: Permission;
}
