import { DemandeStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'clinic', name: 'demandes_analyse' })
@Index(['etablissementId'])
@Index(['etablissementId', 'patientId'])
@Index(['etablissementId', 'statut'])
export class DemandeAnalyseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid' })
  prescripteurId: string;

  @Column()
  typeAnalyse: string;

  @Column({ default: false })
  urgence: boolean;

  @Column({ type: 'enum', enum: DemandeStatut, default: DemandeStatut.EN_ATTENTE })
  statut: DemandeStatut;

  @Column({ type: 'timestamptz' })
  dateDemande: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
