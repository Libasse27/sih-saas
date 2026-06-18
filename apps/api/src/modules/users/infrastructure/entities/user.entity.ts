import { Scope } from '@sih-saas/shared';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserPermissionEntity } from './user-permission.entity';
import { UserRoleEntity } from './user-role.entity';

@Entity({ schema: 'platform', name: 'users' })
@Index(['etablissementId'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Scope })
  scope: Scope;

  // null si scope = PLATFORM
  @Column({ type: 'uuid', nullable: true })
  etablissementId: string | null;

  @Column()
  nom: string;

  @Column()
  prenom: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  telephone: string | null;

  @Column({ select: false })
  passwordHash: string;

  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ type: 'varchar', nullable: true, select: false })
  mfaSecret: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  dernierLogin: Date | null;

  @Column({ default: 0 })
  tentativesEchouees: number;

  @Column({ type: 'timestamptz', nullable: true })
  verrouilleJusqua: Date | null;

  @OneToMany(() => UserRoleEntity, (userRole) => userRole.user)
  userRoles: UserRoleEntity[];

  @OneToMany(() => UserPermissionEntity, (userPermission) => userPermission.user)
  userPermissions: UserPermissionEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
