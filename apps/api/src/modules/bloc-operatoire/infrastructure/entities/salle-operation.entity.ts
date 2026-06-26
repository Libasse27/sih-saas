import { SalleOperationStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Salle d'opération (prompt maître §10.4, module "Bloc Opératoire") — distincte de `ChambreEntity`
 * (Phase 6) : pas d'occupation patient sur plusieurs jours. `statut` reflète l'occupation
 * *courante* du bloc, piloté automatiquement par `InterventionsService` (démarrage/clôture),
 * jamais par une action manuelle (voir `SallesOperationService.update`, même garde que
 * `LitsService.changerStatutStructurel`).
 */
@Entity({ schema: 'clinic', name: 'salles_operation' })
@Index(['etablissementId'])
export class SalleOperationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column()
  nom: string;

  @Column({ type: 'text', nullable: true })
  equipement: string | null;

  @Column({ type: 'enum', enum: SalleOperationStatut, default: SalleOperationStatut.LIBRE })
  statut: SalleOperationStatut;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
