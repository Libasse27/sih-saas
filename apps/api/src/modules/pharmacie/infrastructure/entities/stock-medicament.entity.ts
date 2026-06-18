import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** `medicamentId` est une FK informelle vers `clinic.medicaments_catalogue` (référentiel non-tenant). */
@Entity({ schema: 'clinic', name: 'stock_medicament' })
@Index(['etablissementId'])
@Index(['etablissementId', 'medicamentId'])
export class StockMedicamentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  medicamentId: string;

  @Column()
  lot: string;

  @Column({ type: 'int' })
  quantite: number;

  @Column({ type: 'int' })
  seuilAlerte: number;

  @Column({ type: 'date' })
  dateExpiration: string;

  @Column({ type: 'varchar', nullable: true })
  emplacement: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
