import { FormationStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Module RH — voir employe.entity.ts. */
@Entity({ schema: 'clinic', name: 'formations' })
@Index(['etablissementId'])
@Index(['etablissementId', 'employeId'])
export class FormationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  employeId: string;

  @Column()
  intitule: string;

  @Column({ type: 'varchar', nullable: true })
  organisme: string | null;

  @Column({ type: 'date' })
  dateDebut: string;

  @Column({ type: 'date', nullable: true })
  dateFin: string | null;

  @Column({ type: 'enum', enum: FormationStatut, default: FormationStatut.PLANIFIEE })
  statut: FormationStatut;

  @Column({ type: 'boolean', default: false })
  certificatObtenu: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
