import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'clinic', name: 'comptes_rendus_imagerie' })
@Index(['etablissementId'])
@Index(['etablissementId', 'demandeId'])
export class CompteRenduImagerieEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  demandeId: string;

  @Column({ type: 'uuid' })
  radiologueId: string;

  @Column({ type: 'text', nullable: true })
  conclusion: string | null;

  @Column({ type: 'varchar', nullable: true })
  fichierDicomUrl: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  dateValidation: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
