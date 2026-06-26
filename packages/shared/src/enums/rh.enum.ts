// Module RH (prompt maître §10.4, taxonomie 15 modules métiers) — gaté par Plan.modules via
// ModuleMetier.RH. Permissions `rh:view` (lecture) / `rh:manage` (écriture) — voir permission.enum.ts.
// Hors scope explicite : aucun calcul de paie (pas d'entité Paie) et aucune intégration biométrique
// de pointage (Presence est une saisie manuelle).
export enum EmployeStatut {
  ACTIF = 'ACTIF',
  INACTIF = 'INACTIF',
  SUSPENDU = 'SUSPENDU',
  DEMISSIONNAIRE = 'DEMISSIONNAIRE',
}

export enum ContratTravailType {
  CDI = 'CDI',
  CDD = 'CDD',
  STAGE = 'STAGE',
  VACATION = 'VACATION',
  PRESTATION = 'PRESTATION',
}

export enum ContratTravailStatut {
  ACTIF = 'ACTIF',
  TERMINE = 'TERMINE',
  SUSPENDU = 'SUSPENDU',
}

export enum CongeType {
  CONGE_PAYE = 'CONGE_PAYE',
  MALADIE = 'MALADIE',
  MATERNITE = 'MATERNITE',
  PATERNITE = 'PATERNITE',
  SANS_SOLDE = 'SANS_SOLDE',
  AUTRE = 'AUTRE',
}

export enum CongeStatut {
  DEMANDE = 'DEMANDE',
  APPROUVE = 'APPROUVE',
  REJETE = 'REJETE',
  ANNULE = 'ANNULE',
}

export enum PresenceStatut {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  RETARD = 'RETARD',
  CONGE = 'CONGE',
}

export enum FormationStatut {
  PLANIFIEE = 'PLANIFIEE',
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE',
}
