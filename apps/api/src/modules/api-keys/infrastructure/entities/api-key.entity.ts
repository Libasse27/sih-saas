import { Permission } from '@sih-saas/shared';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Schéma `platform`, pas de RLS — même convention que `UserEntity` (utilisée hors contexte tenant,
 * la portée établissement est une simple colonne, pas une policy Postgres). `secretHash` n'est
 * jamais sélectionné par défaut (même précaution que `UserEntity.passwordHash`) ; le secret en
 * clair n'est jamais persisté, uniquement retourné une fois à la création (voir ApiKeysService).
 */
@Entity({ schema: 'platform', name: 'api_keys' })
@Index(['etablissementId'])
@Index(['prefixe'])
export class ApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column()
  nom: string;

  // Préfixe affiché en clair (identification visuelle dans la liste) — jamais le secret complet.
  @Column()
  prefixe: string;

  @Column({ select: false })
  secretHash: string;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  permissions: Permission[];

  @Column({ default: true })
  actif: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  expirationDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  derniereUtilisation: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
