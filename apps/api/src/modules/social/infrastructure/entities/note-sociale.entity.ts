import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Module support (Phase 11) — ASSISTANT_SOCIAL, permissions `social:manage` (écriture) +
 * `dossier:read` 🩺 (lecture, matrice-rbac.md §"volet social uniquement"). Append-only (pas de
 * PATCH) : une note sociale n'est jamais réécrite, seulement complétée par une nouvelle entrée —
 * même logique que les observations du DME (Phase 5).
 */
@Entity({ schema: 'clinic', name: 'notes_sociales' })
@Index(['etablissementId'])
@Index(['patientId'])
export class NoteSocialeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid' })
  auteurId: string;

  @Column()
  contenu: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
