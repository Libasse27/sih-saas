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
