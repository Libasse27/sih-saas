import { AdministrationStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'clinic', name: 'administration_medicament' })
@Index(['etablissementId'])
@Index(['etablissementId', 'patientId'])
export class AdministrationMedicamentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  prescriptionLigneId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid' })
  infirmierId: string;

  @Column({ type: 'timestamptz' })
  dateHeure: Date;

  @Column({ type: 'enum', enum: AdministrationStatut })
  statut: AdministrationStatut;

  @Column({ type: 'text', nullable: true })
  commentaire: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
