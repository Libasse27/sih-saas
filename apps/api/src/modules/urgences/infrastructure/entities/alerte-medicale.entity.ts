import { AlerteUrgenceStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Alerte médicale levée pendant une prise en charge aux urgences, diffusée en temps réel à l'équipe. */
@Entity({ schema: 'clinic', name: 'alertes_medicales' })
@Index(['etablissementId'])
@Index(['etablissementId', 'urgenceId'])
export class AlerteMedicaleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  urgenceId: string;

  @Column()
  type: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: AlerteUrgenceStatut, default: AlerteUrgenceStatut.EN_COURS })
  statut: AlerteUrgenceStatut;

  // FK informelle vers platform.users.
  @Column({ type: 'uuid' })
  declencheeParId: string;

  @Column({ type: 'uuid', nullable: true })
  acquitteeParId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  dateAcquittement: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
