import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TypeReduction } from '@sih-saas/shared';
import { numericTransformer } from '../../../../shared/transformers/numeric.transformer';

/** Référentiel plateforme, pas de tenant — pas de RLS (voir platform.users/platform.api_keys). */
@Entity({ schema: 'platform', name: 'coupons' })
export class CouponEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'enum', enum: TypeReduction })
  typeReduction: TypeReduction;

  @Column({ type: 'numeric', transformer: numericTransformer })
  valeur: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** null/vide = applicable à tous les plans. */
  @Column({ type: 'uuid', array: true, nullable: true })
  planIds: string[] | null;

  @Column({ type: 'timestamptz' })
  dateDebut: Date;

  @Column({ type: 'timestamptz' })
  dateFin: Date;

  /** -1 = illimité (même convention que PlanLimites.maxXxx). */
  @Column({ default: -1 })
  limiteUtilisation: number;

  @Column({ default: 0 })
  utilisationsCount: number;

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
