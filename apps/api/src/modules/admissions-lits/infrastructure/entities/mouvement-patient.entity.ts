import { MouvementType } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Journal append-only des mouvements (entrée/transfert/sortie) — jamais modifié ni supprimé. */
@Entity({ schema: 'clinic', name: 'mouvements_patient' })
@Index(['etablissementId'])
@Index(['etablissementId', 'admissionId'])
export class MouvementPatientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid' })
  admissionId: string;

  @Column({ type: 'enum', enum: MouvementType })
  type: MouvementType;

  @Column({ type: 'uuid', nullable: true })
  serviceOrigineId: string | null;

  @Column({ type: 'uuid', nullable: true })
  litOrigineId: string | null;

  @Column({ type: 'uuid', nullable: true })
  serviceDestinationId: string | null;

  @Column({ type: 'uuid', nullable: true })
  litDestinationId: string | null;

  @Column({ type: 'timestamptz' })
  dateMouvement: Date;

  // FK informelle vers platform.users (agent ayant effectué le mouvement).
  @Column({ type: 'uuid' })
  effectueParId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
