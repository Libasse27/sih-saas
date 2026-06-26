import { ContratTravailStatut, ContratTravailType } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Module RH — voir employe.entity.ts. `salaireBase` en XOF (devise implicite, même convention que le reste du projet). */
@Entity({ schema: 'clinic', name: 'contrats_travail' })
@Index(['etablissementId'])
@Index(['etablissementId', 'employeId'])
export class ContratTravailEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  employeId: string;

  @Column({ type: 'enum', enum: ContratTravailType })
  type: ContratTravailType;

  @Column({ type: 'date' })
  dateDebut: string;

  @Column({ type: 'date', nullable: true })
  dateFin: string | null;

  @Column({ type: 'numeric' })
  salaireBase: number;

  @Column({ type: 'enum', enum: ContratTravailStatut, default: ContratTravailStatut.ACTIF })
  statut: ContratTravailStatut;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
