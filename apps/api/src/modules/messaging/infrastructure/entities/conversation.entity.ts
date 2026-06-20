import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Messagerie sécurisée (Phase 14, prompt maître §14) — un patient ne peut démarrer une conversation
 * qu'avec un praticien de SON établissement (vérifié par MessagingService via
 * `UsersService.estPraticienValide`, même garde que la création de RDV en Phase 10). Une seule
 * conversation par paire (patientId, praticienId) — réutilisée si elle existe déjà.
 */
@Entity({ schema: 'clinic', name: 'conversations' })
@Index(['etablissementId'])
@Index(['etablissementId', 'patientId', 'praticienId'], { unique: true })
export class ConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid' })
  praticienId: string;

  @Column({ type: 'timestamptz', nullable: true })
  dernierMessageAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
