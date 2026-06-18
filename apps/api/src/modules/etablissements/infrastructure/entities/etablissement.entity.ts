import { EtablissementStatut, EtablissementType } from '@sih-saas/shared';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface EtablissementUsage {
  utilisateurs: number;
  lits: number;
  stockageMo: number;
}

@Entity({ schema: 'platform', name: 'etablissements' })
export class EtablissementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ type: 'enum', enum: EtablissementType })
  type: EtablissementType;

  @Column({ type: 'varchar', nullable: true })
  rccm: string | null;

  @Column({ type: 'varchar', nullable: true })
  ninea: string | null;

  @Column({ type: 'varchar', nullable: true })
  adresse: string | null;

  @Column({ type: 'varchar', nullable: true })
  ville: string | null;

  @Column({ default: 'Sénégal' })
  pays: string;

  @Column({ type: 'varchar', nullable: true })
  telephone: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  logo: string | null;

  @Column({ default: 'XOF' })
  devise: string;

  @Column({ default: 'fr-SN' })
  langue: string;

  @Column({ default: 'Africa/Dakar' })
  fuseau: string;

  // Lien vers l'utilisateur ADMIN_ETABLISSEMENT — renseigné à la création (Phase 1) ou au provisionnement (Phase 4).
  @Column({ type: 'uuid', nullable: true })
  adminId: string | null;

  @Column({ type: 'enum', enum: EtablissementStatut, default: EtablissementStatut.EN_ATTENTE_PAIEMENT })
  statut: EtablissementStatut;

  @Column({ type: 'jsonb', default: () => `'{"utilisateurs":0,"lits":0,"stockageMo":0}'` })
  usage: EtablissementUsage;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
