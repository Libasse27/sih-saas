// Référence : docs/phase-0/modele-de-donnees.md §2.1 (table subscriptions) et prompt maître §9.
export enum SubscriptionStatut {
  ESSAI = 'ESSAI',
  ACTIF = 'ACTIF',
  EN_PERIODE_GRACE = 'EN_PERIODE_GRACE',
  EXPIRE = 'EXPIRE',
  SUSPENDU = 'SUSPENDU',
  ANNULE = 'ANNULE',
  EN_ATTENTE = 'EN_ATTENTE',
}

export enum Periodicite {
  MENSUEL = 'MENSUEL',
  ANNUEL = 'ANNUEL',
}
