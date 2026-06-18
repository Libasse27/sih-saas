import { AdmissionStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'clinic', name: 'admissions' })
@Index(['etablissementId'])
@Index(['etablissementId', 'patientId'])
@Index(['etablissementId', 'patientId', 'statut'])
export class AdmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid', nullable: true })
  litId: string | null;

  @Column({ type: 'uuid' })
  serviceId: string;

  // FK informelle vers platform.users — généralement un MEDECIN, jamais imposé au niveau base.
  @Column({ type: 'uuid' })
  medecinReferentId: string;

  @Column({ type: 'text' })
  motif: string;

  @Column({ type: 'timestamptz' })
  dateAdmission: Date;

  @Column({ type: 'timestamptz', nullable: true })
  dateSortiePrevue: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  dateSortieReelle: Date | null;

  @Column({ type: 'enum', enum: AdmissionStatut, default: AdmissionStatut.EN_COURS })
  statut: AdmissionStatut;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
