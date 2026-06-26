import { EmployeStatut, Sexe } from '@sih-saas/shared';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Module RH (prompt maître §10.4, taxonomie 15 modules métiers) — gaté par Plan.modules via
 * ModuleMetier.RH, permissions `rh:view`/`rh:manage`. Aucun accès clinique, aucun CareContextGuard
 * (pas de lien patient) — même famille que le module support (voir maintenance/demande-maintenance.entity.ts).
 * `userId` et `serviceId` sont des FK informelles (même convention que `services.responsableId`) :
 * pas de contrainte FK, juste un uuid indicatif vers platform.users / clinic.services.
 */
@Entity({ schema: 'clinic', name: 'employes' })
@Index(['etablissementId'])
@Index(['etablissementId', 'matricule'], { unique: true })
export class EmployeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column()
  matricule: string;

  @Column()
  nom: string;

  @Column()
  prenom: string;

  @Column()
  poste: string;

  @Column({ type: 'uuid', nullable: true })
  serviceId: string | null;

  @Column({ type: 'date' })
  dateEmbauche: string;

  @Column({ type: 'date', nullable: true })
  dateNaissance: string | null;

  @Column({ type: 'enum', enum: Sexe, nullable: true })
  sexe: Sexe | null;

  @Column({ type: 'varchar', nullable: true })
  telephone: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  adresse: string | null;

  @Column({ type: 'enum', enum: EmployeStatut, default: EmployeStatut.ACTIF })
  statut: EmployeStatut;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
