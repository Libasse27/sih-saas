import { OrganismeAssurance } from '@sih-saas/shared';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'clinic', name: 'assurances' })
@Index(['etablissementId'])
@Index(['etablissementId', 'patientId'])
export class AssuranceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'enum', enum: OrganismeAssurance })
  organisme: OrganismeAssurance;

  @Column()
  numeroPolice: string;

  /** Pourcentage de prise en charge, 0-100. */
  @Column({ type: 'int' })
  tauxCouverture: number;

  @Column({ type: 'date' })
  valideDu: string;

  @Column({ type: 'date' })
  valideAu: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
