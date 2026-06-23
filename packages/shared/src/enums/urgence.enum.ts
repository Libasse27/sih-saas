// Référence : prompt maître §10.4 (module métier "Urgences") — docs/phase-0/modele-de-donnees.md
// à compléter avec clinic.urgences / triages / alertes_medicales / surveillances_urgence.

/** Échelle de triage à la française (IOA), du plus au moins urgent. */
export enum NiveauTriage {
  VITAL = 'VITAL',
  TRES_URGENT = 'TRES_URGENT',
  URGENT = 'URGENT',
  PEU_URGENT = 'PEU_URGENT',
  NON_URGENT = 'NON_URGENT',
}

export enum UrgenceStatut {
  EN_ATTENTE = 'EN_ATTENTE',
  EN_COURS = 'EN_COURS',
  TRANSFEREE = 'TRANSFEREE',
  SORTIE = 'SORTIE',
  DECES = 'DECES',
}

export enum AlerteUrgenceStatut {
  EN_COURS = 'EN_COURS',
  ACQUITTEE = 'ACQUITTEE',
}

/** Issue de la clôture d'un épisode d'urgence (UrgencesPatientService.cloturer). */
export enum IssueUrgence {
  TRANSFERT_HOSPITALISATION = 'TRANSFERT_HOSPITALISATION',
  SORTIE = 'SORTIE',
  DECES = 'DECES',
}
