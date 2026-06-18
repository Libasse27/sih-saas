import { Periodicite, PlanSnapshot, SubscriptionStatut } from '@sih-saas/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface SubscriptionHistoriqueEntry {
  date: string;
  action: string;
  details?: Record<string, unknown>;
}

/**
 * planSnapshot = copie figée du Plan au moment de la souscription/migration — grandfathering
 * (prompt maître §8). Toutes les vérifications de feature/limite lisent CE champ, jamais `plans`.
 */
@Entity({ schema: 'platform', name: 'subscriptions' })
@Index(['etablissementId'])
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  planId: string;

  @Column({ type: 'jsonb' })
  planSnapshot: PlanSnapshot;

  @Column({ type: 'enum', enum: Periodicite })
  periodicite: Periodicite;

  @Column({ type: 'timestamptz' })
  dateDebut: Date;

  @Column({ type: 'timestamptz' })
  dateFin: Date;

  @Column({ type: 'enum', enum: SubscriptionStatut })
  statut: SubscriptionStatut;

  @Column({ type: 'numeric' })
  montant: number;

  @Column()
  devise: string;

  @Column({ default: true })
  renouvellementAuto: boolean;

  @Column({ type: 'varchar', nullable: true })
  couponApplique: string | null;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  historique: SubscriptionHistoriqueEntry[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
