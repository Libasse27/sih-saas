import { PaymentProviderType } from '@sih-saas/shared';
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export interface SettingEmail {
  nomExpediteur: string | null;
  emailExpediteur: string | null;
  emailSupport: string | null;
}

export interface SettingPaiements {
  /** Coupe-circuit Flux A (abonnement) UNIQUEMENT — ne touche jamais la facturation patient (Flux B). */
  actifs: boolean;
  /**
   * Passerelle utilisée par PaymentsService.initier() pour le flux abonnement (Phase 17). Absente
   * sur les lignes Setting créées avant cette phase — toujours lire avec `?? PaymentProviderType.SANDBOX`,
   * jamais supposer la clé présente (pas de migration de données, ligne jsonb existante inchangée).
   */
  passerelleActive?: PaymentProviderType;
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
