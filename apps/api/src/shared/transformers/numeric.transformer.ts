import { ValueTransformer } from 'typeorm';

/**
 * Les colonnes Postgres `numeric` sont renvoyées comme des chaînes par le driver `pg` (pour éviter
 * toute perte de précision décimale) — TypeORM ne les convertit JAMAIS automatiquement en `number`,
 * même quand le type TypeScript de la propriété affirme `number`. Sans ce transformer, toute valeur
 * relue depuis la base reste une string ; renvoyée telle quelle dans une requête suivante (ex. un
 * montant pré-rempli côté UI à partir d'une lecture précédente), elle casse silencieusement la
 * validation `@IsNumber()` côté API (une string n'est jamais un number, même "5000").
 *
 * Découvert en Phase 28 : le premier parcours E2E à faire transiter une vraie valeur lecture→UI→
 * écriture (paiement caisse pré-rempli avec `facture.partPatient`) a échoué en 400, alors que toute
 * vérification précédente (curl, tests unitaires avec repository mocké) tapait toujours un nombre
 * JSON littéral à la main — jamais affecté par ce bug, qui ne se manifeste qu'au bout d'un aller-
 * retour réel base→API→UI→API.
 */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};
