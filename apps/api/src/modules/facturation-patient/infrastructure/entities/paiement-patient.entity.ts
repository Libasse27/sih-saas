import { ModePaiementPatient, PaymentStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Flux soins (patient -> établissement) — strictement séparé de `platform.payments` (flux
 * abonnement, établissement -> plateforme). `PaymentStatut` est réutilisé tel quel (générique,
 * EN_ATTENTE/REUSSI/ECHOUE), mais ni l'entité ni le service ne sont partagés.
 */
@Entity({ schema: 'clinic', name: 'paiements_patient' })
@Index(['etablissementId'])
@Index(['etablissementId', 'facturePatientId'])
export class PaiementPatientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  facturePatientId: string;

  @Column({ type: 'numeric' })
  montant: number;

  @Column({ type: 'enum', enum: ModePaiementPatient })
  mode: ModePaiementPatient;

  @Column({ unique: true })
  reference: string;

  @Column({ type: 'enum', enum: PaymentStatut, default: PaymentStatut.EN_ATTENTE })
  statut: PaymentStatut;

  // Null si le patient a payé lui-même en ligne (pas de caissier impliqué).
  @Column({ type: 'uuid', nullable: true })
  caissierId: string | null;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column({ type: 'jsonb', nullable: true })
  rawPayload: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
