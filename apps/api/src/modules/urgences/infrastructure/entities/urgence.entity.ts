import { NiveauTriage, UrgenceStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Épisode aux urgences (prompt maître §10.4, module "Urgences") — précède une éventuelle
 * `AdmissionEntity` (créée seulement au moment du transfert vers hospitalisation, voir
 * UrgencesPatientService.cloturer). `niveauTriage`/`medecinPriseEnChargeId` mirorrent l'état
 * courant ; l'historique des triages vit dans `TriageEntity` (même convention que
 * `LitEntity.patientActuelId` vs `MouvementPatientEntity`).
 */
@Entity({ schema: 'clinic', name: 'urgences' })
@Index(['etablissementId'])
@Index(['etablissementId', 'patientId'])
@Index(['etablissementId', 'statut'])
export class UrgenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid' })
  serviceId: string;

  @Column({ type: 'text' })
  motif: string;

  @Column({ type: 'enum', enum: NiveauTriage })
  niveauTriage: NiveauTriage;

  @Column({ type: 'enum', enum: UrgenceStatut, default: UrgenceStatut.EN_ATTENTE })
  statut: UrgenceStatut;

  // FK informelle vers platform.users, jamais imposée au niveau base (même convention que
  // AdmissionEntity.medecinReferentId) — renseigné par prise-en-charge().
  @Column({ type: 'uuid', nullable: true })
  medecinPriseEnChargeId: string | null;

  // Renseigné uniquement si statut = TRANSFEREE (cloture vers hospitalisation).
  @Column({ type: 'uuid', nullable: true })
  admissionId: string | null;

  @Column({ type: 'timestamptz' })
  dateArrivee: Date;

  @Column({ type: 'timestamptz', nullable: true })
  dateSortie: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
