import { PrescriptionStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'clinic', name: 'prescriptions' })
@Index(['etablissementId'])
@Index(['etablissementId', 'patientId'])
export class PrescriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid', nullable: true })
  consultationId: string | null;

  @Column({ type: 'uuid' })
  prescripteurId: string;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column({ type: 'enum', enum: PrescriptionStatut, default: PrescriptionStatut.EN_ATTENTE })
  statut: PrescriptionStatut;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
