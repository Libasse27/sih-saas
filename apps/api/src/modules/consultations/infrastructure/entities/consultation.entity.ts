import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Pas de colonne `dossier_medical_ref` (présente dans la première esquisse du modèle de données) :
 * le DME est unique par (etablissementId, patientId) — voir dossier-medical.schema.ts — donc
 * retrouvable sans référence supplémentaire à porter ici.
 */
@Entity({ schema: 'clinic', name: 'consultations' })
@Index(['etablissementId'])
@Index(['etablissementId', 'patientId'])
@Index(['etablissementId', 'praticienId'])
export class ConsultationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid' })
  praticienId: string;

  @Column({ type: 'uuid', nullable: true })
  rendezVousId: string | null;

  @Column({ type: 'uuid', nullable: true })
  admissionId: string | null;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column({ type: 'text' })
  motif: string;

  @Column({ type: 'text', nullable: true })
  examenClinique: string | null;

  @Column({ type: 'varchar', nullable: true })
  diagnosticCim10: string | null;

  @Column({ type: 'text', nullable: true })
  conclusion: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
