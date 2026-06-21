import { StatutCreanceAssurance } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { numericTransformer } from '../../../../shared/transformers/numeric.transformer';

/**
 * Suivi interne des créances assurance (tiers-payant, Phase 17) — remplace le suivi papier, pas une
 * intégration API (aucune n'existe pour CMU/IPM/mutuelles au Sénégal). Créée automatiquement par
 * FacturesPatientService.create() dès que partAssurance > 0 sur une facture. clinic.*, RLS.
 */
@Entity({ schema: 'clinic', name: 'creances_assurance' })
@Index(['etablissementId'])
@Index(['etablissementId', 'facturePatientId'])
@Index(['etablissementId', 'statut'])
export class CreanceAssuranceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  facturePatientId: string;

  @Column({ type: 'uuid' })
  assuranceId: string;

  @Column({ type: 'numeric', transformer: numericTransformer })
  montant: number;

  @Column({ type: 'enum', enum: StatutCreanceAssurance, default: StatutCreanceAssurance.A_SOUMETTRE })
  statut: StatutCreanceAssurance;

  @Column({ type: 'timestamptz', nullable: true })
  dateSoumission: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  dateReglement: Date | null;

  @Column({ type: 'varchar', nullable: true })
  referenceReglement: string | null;

  @Column({ type: 'varchar', nullable: true })
  motifRejet: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
