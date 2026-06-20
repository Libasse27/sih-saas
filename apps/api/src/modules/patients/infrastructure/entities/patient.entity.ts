import { Sexe, TypeConsentement } from '@sih-saas/shared';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface ContactUrgence {
  nom: string;
  telephone: string;
  relation: string;
}

/**
 * Historique append-only (jamais réécrit/écrasé, voir PatientsService.enregistrerConsentement,
 * Phase 20) — l'état "actuel" d'un type donné est la DERNIÈRE entrée de ce type dans le tableau.
 * `enregistrePar` = userId de qui a recueilli le consentement (le patient lui-même via le portail
 * mobile, ou un membre du personnel à l'admission) — valeur probatoire en cas de contrôle CDP.
 */
export interface ConsentementEntry {
  type: TypeConsentement;
  date: string;
  valeur: boolean;
  enregistrePar: string;
}

/**
 * Première table du schéma `clinic` (RLS réelle — voir la migration associée et
 * docs/phase-0/strategie-isolation.md). IDH = identifiant patient, unique par établissement,
 * généré par PatientsService (domain/idh-generator.ts).
 */
@Entity({ schema: 'clinic', name: 'patients' })
@Index(['etablissementId'])
@Index(['etablissementId', 'idh'], { unique: true })
export class PatientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column()
  idh: string;

  // Lien vers le compte d'accès au portail patient (mobile, Phase 10) — créé à la demande, pas systématique.
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column()
  nom: string;

  @Column()
  prenom: string;

  @Column({ type: 'date' })
  dateNaissance: string;

  @Column({ type: 'enum', enum: Sexe })
  sexe: Sexe;

  @Column({ type: 'varchar', nullable: true })
  telephone: string | null;

  @Column({ type: 'varchar', nullable: true })
  adresse: string | null;

  // FK informelle vers une future table `assurances` (Phase 8) — pas de contrainte FK pour l'instant.
  @Column({ type: 'uuid', nullable: true })
  assuranceId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  contactUrgence: ContactUrgence | null;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  consentements: ConsentementEntry[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
