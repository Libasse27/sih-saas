// Référence : prompt maître §10.4 (module métier "Bloc Opératoire").

/** Même vocabulaire que LitStatut (Phase 6) — pas de nouveaux termes. */
export enum SalleOperationStatut {
  LIBRE = 'LIBRE',
  OCCUPEE = 'OCCUPEE',
  MAINTENANCE = 'MAINTENANCE',
}

export enum InterventionStatut {
  PLANIFIEE = 'PLANIFIEE',
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE',
}

export enum RoleEquipeOperatoire {
  CHIRURGIEN_PRINCIPAL = 'CHIRURGIEN_PRINCIPAL',
  CHIRURGIEN_AIDE = 'CHIRURGIEN_AIDE',
  ANESTHESISTE = 'ANESTHESISTE',
  INFIRMIER_INSTRUMENTISTE = 'INFIRMIER_INSTRUMENTISTE',
  INFIRMIER_CIRCULANTE = 'INFIRMIER_CIRCULANTE',
}

export enum TypeAnesthesie {
  GENERALE = 'GENERALE',
  LOCOREGIONALE = 'LOCOREGIONALE',
  LOCALE = 'LOCALE',
  SEDATION = 'SEDATION',
}

/** Les 3 phases de la check-list de sécurité chirurgicale de l'OMS — noms conservés en anglais,
 * terminologie internationale utilisée telle quelle par les équipes francophones. */
export enum PhaseChecklistOms {
  SIGN_IN = 'SIGN_IN',
  TIME_OUT = 'TIME_OUT',
  SIGN_OUT = 'SIGN_OUT',
}
