import { Permission, PermissionEffect } from '@sih-saas/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from './user.entity';

/** Overrides ponctuels par utilisateur, appliqués après les permissions de rôle. */
@Entity({ schema: 'platform', name: 'user_permissions' })
@Index(['userId', 'permission'], { unique: true })
export class UserPermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.userPermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'enum', enum: Permission })
  permission: Permission;

  @Column({ type: 'enum', enum: PermissionEffect })
  effect: PermissionEffect;
}
