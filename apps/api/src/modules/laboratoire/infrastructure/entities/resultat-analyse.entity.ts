import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'clinic', name: 'resultats_analyse' })
@Index(['etablissementId'])
@Index(['etablissementId', 'demandeId'])
export class ResultatAnalyseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  demandeId: string;

  @Column({ type: 'uuid' })
  biologisteId: string;

  @Column({ type: 'jsonb' })
  resultats: Record<string, unknown>;

  @Column({ default: false })
  valeursCritiques: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  dateValidation: Date | null;

  @Column({ type: 'varchar', nullable: true })
  fichierUrl: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
