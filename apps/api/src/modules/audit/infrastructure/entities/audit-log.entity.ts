import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Append-only : aucune méthode d'update/delete n'est exposée côté service (docs/phase-0/modele-de-donnees.md §2.1). */
@Entity({ schema: 'platform', name: 'audit_logs' })
@Index(['etablissementId', 'createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // null = action plateforme (hors contexte établissement)
  @Column({ type: 'uuid', nullable: true })
  etablissementId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column()
  action: string;

  @Column({ type: 'varchar', nullable: true })
  ressource: string | null;

  @Column({ type: 'uuid', nullable: true })
  ressourceId: string | null;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
