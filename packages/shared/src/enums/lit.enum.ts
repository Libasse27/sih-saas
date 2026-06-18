// Référence : docs/phase-0/modele-de-donnees.md §2 (clinic.lits / clinic.admissions / clinic.mouvements_patient)
export enum LitStatut {
  LIBRE = 'LIBRE',
  OCCUPE = 'OCCUPE',
  RESERVE = 'RESERVE',
  MAINTENANCE = 'MAINTENANCE',
}

export enum AdmissionStatut {
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE',
}

export enum MouvementType {
  ENTREE = 'ENTREE',
  TRANSFERT = 'TRANSFERT',
  SORTIE = 'SORTIE',
}
