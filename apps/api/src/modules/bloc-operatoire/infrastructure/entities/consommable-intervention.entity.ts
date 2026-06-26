import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Décrémente réellement clinic.articles_stock (module Logistique) à la création — voir LogistiqueService.decrementer. */
@Entity({ schema: 'clinic', name: 'consommables_intervention' })
@Index(['etablissementId'])
@Index(['etablissementId', 'interventionId'])
export class ConsommableInterventionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  interventionId: string;

  @Column({ type: 'uuid' })
  articleStockId: string;

  @Column({ type: 'int' })
  quantite: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
