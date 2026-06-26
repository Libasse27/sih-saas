// Modules support (Phase 11, prompt maître §10.4) — Maintenance et Stérilisation sont gatés par
// Plan.modules via ModuleMetier.LOGISTIQUE_STOCK depuis la restructuration de la taxonomie en 15
// modules métiers (Logistique/Maintenance/Stérilisation forment un seul module métier). Seuls la
// gestion des utilisateurs/services et les modules Service social/Messagerie restent non gatés,
// disponibles quel que soit le forfait.
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
