import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Relevé de signes vitaux pendant la prise en charge aux urgences (surveillance temps réel). */
@Entity({ schema: 'clinic', name: 'surveillances_urgence' })
@Index(['etablissementId'])
@Index(['etablissementId', 'urgenceId'])
export class SurveillanceUrgenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  urgenceId: string;

  @Column({ type: 'varchar', nullable: true })
  tensionArterielle: string | null;

  @Column({ type: 'int', nullable: true })
  pouls: number | null;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  temperature: number | null;

  @Column({ type: 'int', nullable: true })
  saturationO2: number | null;

  @Column({ type: 'int', nullable: true })
  frequenceRespiratoire: number | null;

  @Column({ type: 'int', nullable: true })
  glasgow: number | null;

  @Column({ type: 'text', nullable: true })
  observation: string | null;

  // FK informelle vers platform.users.
  @Column({ type: 'uuid' })
  releveParId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
