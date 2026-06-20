// Modules support (Phase 11, prompt maître §10.4) — non gateés par Plan.modules (ClinicalModule),
// disponibles quel que soit le forfait, au même titre que la gestion des utilisateurs/services.
export enum DemandeMaintenanceStatut {
  SIGNALEE = 'SIGNALEE',
  EN_COURS = 'EN_COURS',
  RESOLUE = 'RESOLUE',
  ANNULEE = 'ANNULEE',
}

export enum CycleSterilisationStatut {
  EN_COURS = 'EN_COURS',
  TERMINE = 'TERMINE',
  REJETE = 'REJETE',
}
