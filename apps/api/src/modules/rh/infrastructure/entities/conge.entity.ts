import { CongeStatut, CongeType } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Module RH — voir employe.entity.ts. `valideParUserId` est une FK informelle vers platform.users
 * (même convention que `employes.userId`). C'est RH qui saisit la demande (pas de self-service
 * employé, aucun rôle "employé" générique dans ce système) — voir conges.controller.ts.
 */
@Entity({ schema: 'clinic', name: 'conges' })
@Index(['etablissementId'])
@Index(['etablissementId', 'employeId'])
export class CongeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  employeId: string;

  @Column({ type: 'enum', enum: CongeType })
  type: CongeType;

  @Column({ type: 'date' })
  dateDebut: string;

  @Column({ type: 'date' })
  dateFin: string;

  @Column({ type: 'int' })
  nombreJours: number;

  @Column({ type: 'varchar', nullable: true })
  motif: string | null;

  @Column({ type: 'enum', enum: CongeStatut, default: CongeStatut.DEMANDE })
  statut: CongeStatut;

  @Column({ type: 'uuid', nullable: true })
  valideParUserId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  dateValidation: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
