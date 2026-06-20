// Référence : docs/phase-0/modele-de-donnees.md §2 (clinic.assurances / factures_patient / paiements_patient)
// Rappel : flux soins (patient -> établissement), strictement séparé du flux abonnement (PaymentStatut/PaymentProviderType, payment.enum.ts).
export enum OrganismeAssurance {
  IPM = 'IPM',
  MUTUELLE = 'MUTUELLE',
  CMU = 'CMU',
  PRIVEE = 'PRIVEE',
}

export enum FacturePatientStatut {
  EN_ATTENTE = 'EN_ATTENTE',
  PARTIELLEMENT_PAYEE = 'PARTIELLEMENT_PAYEE',
  PAYEE = 'PAYEE',
  ANNULEE = 'ANNULEE',
}

export enum ModePaiementPatient {
  CAISSE = 'CAISSE',
  ORANGE_MONEY = 'ORANGE_MONEY',
  WAVE = 'WAVE',
  CARTE = 'CARTE',
}

/**
 * Tiers-payant (Phase 17) : suivi interne des créances assurance — AUCUNE API assureur publique
 * n'existe pour CMU/IPM/mutuelles au Sénégal, ce workflow remplace le suivi papier, il n'automatise
 * aucun encaissement réel auprès de l'assureur.
 */
export enum StatutCreanceAssurance {
  A_SOUMETTRE = 'A_SOUMETTRE',
  SOUMISE = 'SOUMISE',
  PAYEE = 'PAYEE',
  REJETEE = 'REJETEE',
}
