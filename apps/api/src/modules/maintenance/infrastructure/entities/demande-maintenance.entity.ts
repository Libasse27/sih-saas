import { DemandeMaintenanceStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Module support (Phase 11, prompt maître §10.4/§12) — TECHNICIEN_MAINTENANCE, permission
 * `maintenance:manage`, aucun accès clinique (matrice-rbac.md). Non gaté par Plan.modules : pas
 * dans ClinicalModule, disponible quel que soit le forfait (comme `services`/`utilisateurs`).
 */
@Entity({ schema: 'clinic', name: 'demandes_maintenance' })
@Index(['etablissementId'])
export class DemandeMaintenanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column()
  equipement: string;

  @Column({ type: 'varchar', nullable: true })
  localisation: string | null;

  @Column()
  description: string;

  @Column({ type: 'enum', enum: DemandeMaintenanceStatut, default: DemandeMaintenanceStatut.SIGNALEE })
  statut: DemandeMaintenanceStatut;

  // FK informelle vers platform.users (même convention que services.responsableId).
  @Column({ type: 'uuid' })
  demandeurId: string;

  @Column({ type: 'uuid', nullable: true })
  technicienId: string | null;

  @Column({ type: 'timestamptz' })
  dateSignalement: Date;

  @Column({ type: 'timestamptz', nullable: true })
  dateResolution: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
