import { Scope } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Append-only (pas d'édition/suppression de message, même logique que les observations DME) —
 * `auteurScope` indique qui a écrit le message (PATIENT ou ETABLISSEMENT) pour que les deux UI
 * (mobile patient, desktop établissement) sachent aligner la bulle à gauche/droite sans avoir à
 * comparer `auteurId` à l'identité courante côté client.
 */
@Entity({ schema: 'clinic', name: 'messages' })
@Index(['etablissementId'])
@Index(['etablissementId', 'conversationId'])
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  conversationId: string;

  @Column({ type: 'uuid' })
  auteurId: string;

  @Column({ type: 'enum', enum: Scope })
  auteurScope: Scope;

  @Column()
  contenu: string;

  @Column({ default: false })
  luParPatient: boolean;

  @Column({ default: false })
  luParPraticien: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
