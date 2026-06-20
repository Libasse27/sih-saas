/**
 * Statut du dossier d'autorisation auprès de la Commission de Protection des Données Personnelles
 * (CDP, Sénégal — Loi n°2008-12) pour le traitement de données de santé. Voir docs/conformite-rgpd-cdp.md.
 */
export enum StatutAutorisationCdp {
  NON_INITIEE = 'NON_INITIEE',
  DEMANDE_SOUMISE = 'DEMANDE_SOUMISE',
  AUTORISEE = 'AUTORISEE',
  REFUSEE = 'REFUSEE',
  RETIREE = 'RETIREE',
}
