import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Jeton de hash (sha256) du refresh token — jamais la valeur brute. Rotation avec détection de réutilisation. */
@Entity({ schema: 'platform', name: 'refresh_tokens' })
@Index(['userId'])
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ unique: true })
  tokenHash: string;

  @Column({ default: false })
  revoked: boolean;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
