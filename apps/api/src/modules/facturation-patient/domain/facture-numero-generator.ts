/**
 * Format du numéro de facture patient — voir docs/phase-0/modele-de-donnees.md §2.2 :
 * {CODE_ETAB}-FACT-{ANNEE}-{SEQUENCE sur 6 chiffres}, ex. "HMS-FACT-2026-000045".
 * `sequence` provient de EtablissementsService.incrementerCompteur('facture_patient') (atomique, par établissement).
 * Même convention que genererIdh (patients/domain/idh-generator.ts).
 */
export function genererNumeroFacture(codeEtablissement: string, annee: number, sequence: number): string {
  const sequenceFormatee = String(sequence).padStart(6, '0');
  return `${codeEtablissement}-FACT-${annee}-${sequenceFormatee}`;
}
