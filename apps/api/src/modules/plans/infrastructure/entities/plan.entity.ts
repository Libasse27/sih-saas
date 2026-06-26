import { ModuleMetier, PlanFeatures, PlanLimites, PlanTarifs } from '@sih-saas/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Catalogue commercial — source unique de vérité, administrable sans redéploiement (prompt maître §8).
 * Aucun prix/limite/module ne doit jamais être codé en dur ailleurs dans l'application.
 */
@Entity({ schema: 'platform', name: 'plans' })
export class PlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb' })
  tarifs: PlanTarifs;

  @Column({ type: 'jsonb' })
  limites: PlanLimites;

  @Column({ type: 'enum', enum: ModuleMetier, array: true, default: [] })
  modules: ModuleMetier[];

  @Column({ type: 'jsonb' })
  features: PlanFeatures;

  @Column({ default: 0 })
  essaiGratuitJours: number;

  @Column({ default: true })
  visible: boolean;

  @Column({ default: true })
  actif: boolean;

  @Column({ default: 0 })
  ordreAffichage: number;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
