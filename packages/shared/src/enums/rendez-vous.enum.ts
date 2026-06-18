// Référence : docs/phase-0/modele-de-donnees.md §2 (clinic.rendez_vous)
export enum RendezVousStatut {
  PLANIFIE = 'PLANIFIE',
  CONFIRME = 'CONFIRME',
  TERMINE = 'TERMINE',
  ANNULE = 'ANNULE',
  NO_SHOW = 'NO_SHOW',
}

export enum CanalRdv {
  SUR_SITE = 'SUR_SITE',
  TELECONSULTATION = 'TELECONSULTATION',
}
