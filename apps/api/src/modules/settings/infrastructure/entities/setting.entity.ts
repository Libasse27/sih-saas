import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export interface SettingEmail {
  nomExpediteur: string | null;
  emailExpediteur: string | null;
  emailSupport: string | null;
}

export interface SettingPaiements {
  /** Coupe-circuit Flux A (abonnement) UNIQUEMENT — ne touche jamais la facturation patient (Flux B). */
  actifs: boolean;
}

/**
 * Ligne unique (id figé) — pas un magasin clé-valeur générique : seuls les champs réellement
 * consommés par le code (MailService, PaymentsService) existent ici, voir docs/phase-0 +
 * mémoire Phase 16. Référentiel plateforme, pas de tenant — pas de RLS.
 */
@Entity({ schema: 'platform', name: 'settings' })
export class SettingEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  email: SettingEmail;

  @Column({ type: 'jsonb' })
  paiements: SettingPaiements;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
