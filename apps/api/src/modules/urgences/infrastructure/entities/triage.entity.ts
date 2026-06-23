import { NiveauTriage } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Historique des évaluations de triage d'une UrgenceEntity (re-triage en cas d'attente prolongée). */
@Entity({ schema: 'clinic', name: 'triages' })
@Index(['etablissementId'])
@Index(['etablissementId', 'urgenceId'])
export class TriageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  urgenceId: string;

  @Column({ type: 'enum', enum: NiveauTriage })
  niveau: NiveauTriage;

  @Column({ type: 'varchar', nullable: true })
  tensionArterielle: string | null;

  @Column({ type: 'int', nullable: true })
  pouls: number | null;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  temperature: number | null;

  @Column({ type: 'int', nullable: true })
  saturationO2: number | null;

  // FK informelle vers platform.users.
  @Column({ type: 'uuid' })
  effectueParId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
