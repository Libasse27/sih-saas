import { TypeAnesthesie } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export interface ProduitAnesthesie {
  nom: string;
  dose: string;
  voie: string;
}

export interface ReleveSurveillanceAnesthesie {
  heure: string;
  tensionArterielle: string | null;
  pouls: number | null;
  saturationO2: number | null;
  observation: string | null;
}

/** Une seule par intervention (unique sur interventionId) — produits/surveillance en jsonb : volume
 * attendu plus faible que SurveillanceUrgenceEntity (quelques relevés par intervention, pas un flux
 * continu multi-jours). */
@Entity({ schema: 'clinic', name: 'anesthesies' })
@Index(['etablissementId'])
@Index(['interventionId'], { unique: true })
export class AnesthesieEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  interventionId: string;

  @Column({ type: 'uuid' })
  anesthesisteId: string;

  @Column({ type: 'enum', enum: TypeAnesthesie })
  type: TypeAnesthesie;

  @Column({ type: 'int', nullable: true })
  scoreAsa: number | null;

  @Column({ type: 'jsonb' })
  produits: ProduitAnesthesie[];

  @Column({ type: 'jsonb' })
  surveillance: ReleveSurveillanceAnesthesie[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
