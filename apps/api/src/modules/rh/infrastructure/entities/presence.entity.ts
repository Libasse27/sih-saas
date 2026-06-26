import { PresenceStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Module RH — voir employe.entity.ts. Saisie manuelle (hors scope : aucune intégration biométrique
 * de pointage). Un seul pointage par jour par employé — voir l'index unique composé ci-dessous et
 * presences.service.ts pour la logique d'upsert sur conflit.
 */
@Entity({ schema: 'clinic', name: 'presences' })
@Index(['etablissementId'])
@Index(['etablissementId', 'employeId', 'date'], { unique: true })
export class PresenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  employeId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time', nullable: true })
  heureArrivee: string | null;

  @Column({ type: 'time', nullable: true })
  heureDepart: string | null;

  @Column({ type: 'enum', enum: PresenceStatut })
  statut: PresenceStatut;

  @Column({ type: 'varchar', nullable: true })
  commentaire: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
