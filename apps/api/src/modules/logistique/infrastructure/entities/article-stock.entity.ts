import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Module support (Phase 11) — MAGASINIER, permissions `stock:view`/`stock:manage`
 * (matrice-rbac.md : « hors médicaments réglementés »). Stock général non-médicamenteux
 * (consommables, fournitures, équipement) — distinct de `clinic.stock_medicament` (pharmacie,
 * Phase 7), jamais réutilisé pour ne pas mélanger les deux référentiels.
 */
@Entity({ schema: 'clinic', name: 'articles_stock' })
@Index(['etablissementId'])
export class ArticleStockEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column()
  nom: string;

  @Column({ type: 'varchar', nullable: true })
  categorie: string | null;

  @Column({ type: 'int', default: 0 })
  quantite: number;

  @Column({ type: 'int', default: 0 })
  seuilAlerte: number;

  @Column()
  unite: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
