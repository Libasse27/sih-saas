import { LitStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * `serviceId` est dénormalisé depuis la chambre (renseigné à la création, jamais modifié sans
 * déplacer le lit) pour permettre de filtrer « lits libres d'un service » sans jointure —
 * cohérent avec la dénormalisation déjà choisie sur `mouvements_patient` (modele-de-donnees.md §2).
 */
@Entity({ schema: 'clinic', name: 'lits' })
@Index(['etablissementId'])
@Index(['etablissementId', 'statut'])
@Index(['etablissementId', 'serviceId', 'statut'])
@Index(['etablissementId', 'chambreId', 'numero'], { unique: true })
export class LitEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  chambreId: string;

  @Column({ type: 'uuid' })
  serviceId: string;

  @Column()
  numero: string;

  @Column({ type: 'enum', enum: LitStatut, default: LitStatut.LIBRE })
  statut: LitStatut;

  @Column({ type: 'uuid', nullable: true })
  patientActuelId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
