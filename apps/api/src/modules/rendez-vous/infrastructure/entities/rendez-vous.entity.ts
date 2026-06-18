import { CanalRdv, RendezVousStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'clinic', name: 'rendez_vous' })
@Index(['etablissementId'])
@Index(['etablissementId', 'dateHeure'])
@Index(['etablissementId', 'praticienId', 'dateHeure'])
@Index(['etablissementId', 'patientId'])
export class RendezVousEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid' })
  praticienId: string;

  @Column({ type: 'uuid', nullable: true })
  serviceId: string | null;

  @Column({ type: 'timestamptz' })
  dateHeure: Date;

  @Column({ default: 30 })
  dureeMin: number;

  @Column({ type: 'varchar', nullable: true })
  motif: string | null;

  @Column({ type: 'enum', enum: RendezVousStatut, default: RendezVousStatut.PLANIFIE })
  statut: RendezVousStatut;

  @Column({ type: 'enum', enum: CanalRdv, default: CanalRdv.SUR_SITE })
  canal: CanalRdv;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
