// Référence : docs/phase-0/modele-de-donnees.md §2 (clinic.demandes_analyse / demandes_imagerie / administration_medicament)
// Réutilisé pour clinic.demandes_analyse ET clinic.demandes_imagerie (même cycle de vie).
export enum DemandeStatut {
  EN_ATTENTE = 'EN_ATTENTE',
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE',
}

export enum AdministrationStatut {
  ADMINISTRE = 'ADMINISTRE',
  REFUSE = 'REFUSE',
  OMIS = 'OMIS',
}
