// Référence : docs/phase-0/modele-de-donnees.md §2.1 (table payments) et prompt maître §15.
export enum PaymentStatut {
  EN_ATTENTE = 'EN_ATTENTE',
  REUSSI = 'REUSSI',
  ECHOUE = 'ECHOUE',
}

/** Passerelles actives configurables dans Setting (prompt maître §15) — seule SANDBOX est câblée pour l'instant. */
export enum PaymentProviderType {
  SANDBOX = 'SANDBOX',
  STRIPE = 'STRIPE',
  WAVE = 'WAVE',
  ORANGE_MONEY = 'ORANGE_MONEY',
  CARTE = 'CARTE',
}
