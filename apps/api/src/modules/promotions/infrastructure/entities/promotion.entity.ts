import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Entité d'annonce/enregistrement uniquement (docs/phase-0/modele-de-donnees.md : `regle jsonb`
 * jamais spécifiée, aucun endpoint de calcul de prix dans le prompt maître §10.5) — `regle` est
 * stocké tel quel, jamais interprété par le backend. Pour une réduction qui affecte réellement un
 * prix, voir `CouponEntity`. Référentiel plateforme, pas de tenant — pas de RLS.
 */
@Entity({ schema: 'platform', name: 'promotions' })
export class PromotionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Libre, non interprété par le backend — référence pour l'équipe marketing/commerciale. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  regle: Record<string, unknown>;

  @Column({ type: 'timestamptz' })
  periodeDebut: Date;

  @Column({ type: 'timestamptz' })
  periodeFin: Date;

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
