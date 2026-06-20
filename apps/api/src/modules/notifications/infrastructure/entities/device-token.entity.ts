import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Notifications push (Phase 14) — schéma `platform`, pas de RLS (même convention que
 * `platform.users`/`platform.api_keys` : un jeton appartient à un utilisateur, jamais filtré par
 * tenant directement, voir api-key.entity.ts). Plusieurs jetons par utilisateur possibles
 * (plusieurs appareils). `token` unique : un même jeton Expo Push ne peut appartenir qu'à un seul
 * utilisateur à la fois (ré-enregistrement = upsert, voir PushNotificationsService).
 */
@Entity({ schema: 'platform', name: 'device_tokens' })
@Index(['userId'])
export class DeviceTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ unique: true })
  token: string;

  @Column()
  plateforme: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
