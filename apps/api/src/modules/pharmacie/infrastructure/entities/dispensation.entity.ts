import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export interface LigneDispensee {
  prescriptionLigneId: string;
  medicamentId: string;
  stockMedicamentId: string;
  quantite: number;
}

@Entity({ schema: 'clinic', name: 'dispensations' })
@Index(['etablissementId'])
@Index(['etablissementId', 'prescriptionId'])
export class DispensationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  prescriptionId: string;

  @Column({ type: 'uuid' })
  pharmacienId: string;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column({ type: 'jsonb' })
  lignesDispensees: LigneDispensee[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
