import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Référentiel structurel (service/département) — voir docs/phase-0/modele-de-donnees.md §2.
 * `responsableId` est une FK informelle vers `platform.users` (même convention que
 * `patients.assuranceId`) : pas de contrainte FK, juste un uuid indicatif.
 */
@Entity({ schema: 'clinic', name: 'services' })
@Index(['etablissementId'])
@Index(['etablissementId', 'code'], { unique: true })
export class ServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column()
  nom: string;

  @Column()
  code: string;

  @Column({ type: 'varchar', nullable: true })
  type: string | null;

  @Column({ type: 'uuid', nullable: true })
  responsableId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
