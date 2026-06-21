import { Periodicite, PaymentProviderType, PaymentStatut } from '@sih-saas/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../../../shared/transformers/numeric.transformer';

/**
 * Paiement d'ABONNEMENT (établissement -> plateforme) — à ne jamais confondre avec
 * FacturePatient/PaiementPatient (soins, Phase 8). Voir prompt maître §15.
 */
@Entity({ schema: 'platform', name: 'payments' })
@Index(['etablissementId'])
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  planId: string;

  @Column({ type: 'enum', enum: Periodicite })
  periodicite: Periodicite;

  // Renseigné par ProvisioningService une fois le paiement confirmé.
  @Column({ type: 'uuid', nullable: true })
  subscriptionId: string | null;

  @Column({ type: 'enum', enum: PaymentProviderType })
  provider: PaymentProviderType;

  @Column({ unique: true })
  reference: string;

  @Column({ type: 'numeric', transformer: numericTransformer })
  montant: number;

  @Column()
  devise: string;

  /** Code coupon appliqué à l'initiation (Phase 16) — repris par ProvisioningService au webhook REUSSI. */
  @Column({ type: 'varchar', nullable: true })
  couponCode: string | null;

  /** Identifiant CÔTÉ FOURNISSEUR (session Wave, pay_token Orange Money) — requis pour rembourser(), jamais notre `reference`. */
  @Column({ type: 'varchar', nullable: true })
  providerReference: string | null;

  @Column({ type: 'enum', enum: PaymentStatut, default: PaymentStatut.EN_ATTENTE })
  statut: PaymentStatut;

  @Column({ type: 'jsonb', nullable: true })
  rawPayload: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
