export interface ProrationInput {
  ancienMontant: number;
  nouveauMontant: number;
  joursRestants: number;
  joursTotal: number;
}

/**
 * Montant à facturer (ou à créditer si négatif) lors d'un changement de plan en cours de cycle.
 * Référence : prompt maître §9 ("proration en upgrade/downgrade").
 *
 * Le crédit restant sur l'ancien plan est déduit du coût du nouveau plan pour la durée restante.
 */
export function calculerProrata({
  ancienMontant,
  nouveauMontant,
  joursRestants,
  joursTotal,
}: ProrationInput): number {
  if (joursTotal <= 0) {
    throw new Error('joursTotal doit être strictement positif.');
  }
  const joursRestantsBornes = Math.min(Math.max(joursRestants, 0), joursTotal);
  const ratio = joursRestantsBornes / joursTotal;

  const creditRestantAncienPlan = ancienMontant * ratio;
  const coutNouveauPlanRestant = nouveauMontant * ratio;

  return Math.round(coutNouveauPlanRestant - creditRestantAncienPlan);
}
