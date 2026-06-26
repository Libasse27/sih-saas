import { JournalCode } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../../shared/transformers/numeric.transformer';

@Entity({ schema: 'clinic', name: 'ecritures_comptables' })
@Index(['etablissementId'])
@Index(['etablissementId', 'date'])
@Index(['etablissementId', 'journalCode'])
export class EcritureComptableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'etablissement_id' })
  etablissementId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: JournalCode, name: 'journal_code' })
  journalCode: JournalCode;

  @Column({ length: 30 })
  numero: string;

  @Column({ length: 255 })
  libelle: string;

  @Column({ length: 10, name: 'compte_debit_code' })
  compteDebitCode: string;

  @Column({ type: 'numeric', name: 'montant_debit', transformer: numericTransformer })
  montantDebit: number;

  @Column({ length: 10, name: 'compte_credit_code' })
  compteCreditCode: string;

  @Column({ type: 'numeric', name: 'montant_credit', transformer: numericTransformer })
  montantCredit: number;

  @Column({ length: 100, name: 'piece_ref', nullable: true })
  pieceRef: string | null;

  @Column({ type: 'uuid', name: 'saisie_par_id', nullable: true })
  saisieParId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
