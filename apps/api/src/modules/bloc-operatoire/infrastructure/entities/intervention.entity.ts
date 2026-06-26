import { InterventionStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export interface ChecklistPhaseEtat {
  valide: boolean;
  valideParId: string | null;
  valideLe: string | null;
}

export interface ChecklistOms {
  signIn: ChecklistPhaseEtat;
  timeOut: ChecklistPhaseEtat;
  signOut: ChecklistPhaseEtat;
}

export const CHECKLIST_OMS_INITIALE: ChecklistOms = {
  signIn: { valide: false, valideParId: null, valideLe: null },
  timeOut: { valide: false, valideParId: null, valideLe: null },
  signOut: { valide: false, valideParId: null, valideLe: null },
};

/**
 * Intervention chirurgicale (prompt maître §10.4) — liée directement à `patientId` (comme
 * `Consultation`/`Prescription`), `admissionId` optionnel (chirurgie ambulatoire possible). Voir
 * docs/superpowers/specs/2026-06-24-bloc-operatoire-design.md.
 */
@Entity({ schema: 'clinic', name: 'interventions' })
@Index(['etablissementId'])
@Index(['etablissementId', 'patientId'])
@Index(['etablissementId', 'salleOperationId'])
export class InterventionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid', nullable: true })
  admissionId: string | null;

  @Column({ type: 'uuid' })
  salleOperationId: string;

  @Column({ type: 'uuid' })
  chirurgienPrincipalId: string;

  @Column()
  typeIntervention: string;

  @Column({ type: 'enum', enum: InterventionStatut, default: InterventionStatut.PLANIFIEE })
  statut: InterventionStatut;

  @Column({ type: 'timestamptz' })
  dateHeurePrevue: Date;

  @Column({ type: 'int', nullable: true })
  dureeEstimeeMinutes: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  dateHeureDebutReelle: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  dateHeureFinReelle: Date | null;

  @Column({ type: 'jsonb' })
  checklistOms: ChecklistOms;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
