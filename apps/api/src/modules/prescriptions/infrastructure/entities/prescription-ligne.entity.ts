import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** `medicamentId` est une FK informelle vers `clinic.medicaments_catalogue` (référentiel non-tenant). */
@Entity({ schema: 'clinic', name: 'prescription_lignes' })
@Index(['etablissementId'])
@Index(['etablissementId', 'prescriptionId'])
export class PrescriptionLigneEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  prescriptionId: string;

  @Column({ type: 'uuid' })
  medicamentId: string;

  @Column()
  posologie: string;

  @Column()
  duree: string;

  @Column()
  voie: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
