/**
 * Format de l'identifiant patient (IDH) — voir docs/phase-0/modele-de-donnees.md §2.2 :
 * {CODE_ETAB}-{ANNEE}-{SEQUENCE sur 6 chiffres}, ex. "HMS-2026-000123".
 * `sequence` provient de EtablissementsService.incrementerCompteur('patient') (atomique, par établissement).
 */
export function genererIdh(codeEtablissement: string, annee: number, sequence: number): string {
  const sequenceFormatee = String(sequence).padStart(6, '0');
  return `${codeEtablissement}-${annee}-${sequenceFormatee}`;
}
