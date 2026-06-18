import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Référentiel global, PAS de `etablissementId`, PAS de RLS — voir docs/phase-0/modele-de-donnees.md §2 :
 * « référentiel global, non tenant ». Partagé par tous les établissements (comme un formulaire
 * pharmaceutique national), à la différence de `clinic.stock_medicament` qui lui est par établissement.
 */
@Entity({ schema: 'clinic', name: 'medicaments_catalogue' })
@Index(['dci'])
export class MedicamentCatalogueEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  dci: string;

  @Column({ type: 'varchar', nullable: true })
  codeAtc: string | null;

  @Column()
  forme: string;

  @Column()
  dosage: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
