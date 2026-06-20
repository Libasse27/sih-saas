import { CycleSterilisationStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Module support (Phase 11) — AGENT_STERILISATION, permission `sterilisation:manage`, aucun accès
 * clinique (matrice-rbac.md). Non gaté par Plan.modules, disponible quel que soit le forfait.
 */
@Entity({ schema: 'clinic', name: 'cycles_sterilisation' })
@Index(['etablissementId'])
export class CycleSterilisationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column()
  materiel: string;

  @Column()
  numeroLot: string;

  @Column({ type: 'enum', enum: CycleSterilisationStatut, default: CycleSterilisationStatut.EN_COURS })
  statut: CycleSterilisationStatut;

  // FK informelle vers platform.users.
  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'timestamptz' })
  dateDebut: Date;

  @Column({ type: 'timestamptz', nullable: true })
  dateFin: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
