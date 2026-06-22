import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Site physique (succursale/antenne) d'un établissement — Phase 34, prompt maître §8 (`Plan.features.multiSites`).
 * `Service.siteId` (et par dénormalisation `Chambre.siteId`/`Lit.siteId`) rattache la structure
 * existante à un site. Voir docs/phase-0/modele-de-donnees.md §2.
 */
@Entity({ schema: 'clinic', name: 'sites' })
@Index(['etablissementId'])
@Index(['etablissementId', 'code'], { unique: true })
export class SiteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column()
  nom: string;

  @Column()
  code: string;

  @Column({ type: 'varchar', nullable: true })
  adresse: string | null;

  @Column({ type: 'varchar', nullable: true })
  ville: string | null;

  @Column({ type: 'varchar', nullable: true })
  telephone: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
