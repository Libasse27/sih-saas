import { EtablissementStatut, EtablissementType, StatutAutorisationCdp } from '@sih-saas/shared';
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

/** Compteurs de numérotation par établissement (prompt maître §11) — étendu au fil des phases (patient, facture...). */
export interface EtablissementCompteurs {
  patient?: number;
  [cle: string]: number | undefined;
}

@Entity({ schema: 'platform', name: 'etablissements' })
export class EtablissementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Court identifiant lisible (ex. "HMS"), utilisé dans la numérotation des dossiers patients (IDH).
  @Column({ unique: true })
  code: string;

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

  // Renseigné par SubscriptionsService à la souscription (Phase 3) — voir modele-de-donnees.md §2.1.
  @Column({ type: 'uuid', nullable: true })
  abonnementActifId: string | null;

  @Column({ type: 'jsonb', default: () => `'{"utilisateurs":0,"lits":0,"stockageMo":0}'` })
  usage: EtablissementUsage;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  compteurs: EtablissementCompteurs;

  // Suivi du dossier d'autorisation CDP (Phase 23, voir docs/conformite-rgpd-cdp.md) — visibilité/
  // gouvernance uniquement, ne bloque aucun flux clinique ni l'activation de l'établissement.
  @Column({ type: 'enum', enum: StatutAutorisationCdp, default: StatutAutorisationCdp.NON_INITIEE })
  statutCdp: StatutAutorisationCdp;

  @Column({ type: 'varchar', nullable: true })
  numeroRecepisseCdp: string | null;

  @Column({ type: 'date', nullable: true })
  dateDemandeCdp: string | null;

  @Column({ type: 'date', nullable: true })
  dateDecisionCdp: string | null;

  @Column({ type: 'text', nullable: true })
  commentaireCdp: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
