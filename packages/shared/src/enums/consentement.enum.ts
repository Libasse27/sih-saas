// Référence : docs/conformite-rgpd-cdp.md (Phase 19) — la loi sénégalaise 2008-12 exige un
// consentement préalable pour tout traitement de données de santé (donnée sensible).
export enum TypeConsentement {
  /** Le consentement légalement requis — préalable à tout traitement de données de santé. */
  TRAITEMENT_DONNEES_SANTE = 'TRAITEMENT_DONNEES_SANTE',
  /** Partage des données avec l'assureur du patient (tiers-payant, Phase 8/17). */
  PARTAGE_ASSURANCE = 'PARTAGE_ASSURANCE',
  /** SMS/email/notifications push — distinct du traitement médical lui-même. */
  COMMUNICATION_ELECTRONIQUE = 'COMMUNICATION_ELECTRONIQUE',
}
