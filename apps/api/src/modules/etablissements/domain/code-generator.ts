/**
 * Dérive un code court et lisible à partir du nom de l'établissement (ex. "Hopital de Mbour" -> "HOPI").
 * Les lettres accentuées (é, ô...) ne sont pas dans la plage ASCII A-Z et sont donc simplement ignorées.
 */
export function deriverCodeBase(nom: string): string {
  const lettresUniquement = nom.toUpperCase().replace(/[^A-Z]/g, '');
  return lettresUniquement.slice(0, 4) || 'ETAB';
}
