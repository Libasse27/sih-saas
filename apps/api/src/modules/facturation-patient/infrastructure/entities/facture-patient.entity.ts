import { FacturePatientStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export interface LigneFacture {
  libelle: string;
  quantite: number;
  prixUnitaire: number;
}

@Entity({ schema: 'clinic', name: 'factures_patient' })
@Index(['etablissementId'])
@Index(['etablissementId', 'patientId'])
@Index(['etablissementId', 'numero'], { unique: true })
export class FacturePatientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid', nullable: true })
  admissionId: string | null;

  @Column()
  numero: string;

  @Column({ type: 'jsonb' })
  lignes: LigneFacture[];

  @Column({ type: 'numeric' })
  montantTotal: number;

  @Column({ type: 'numeric' })
  partAssurance: number;

  @Column({ type: 'numeric' })
  partPatient: number;

  @Column({ type: 'enum', enum: FacturePatientStatut, default: FacturePatientStatut.EN_ATTENTE })
  statut: FacturePatientStatut;

  @Column({ type: 'timestamptz' })
  dateEmission: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
