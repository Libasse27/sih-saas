import type { Antecedents } from '../../../dossier-medical/infrastructure/schemas/dossier-medical.schema';

export function mapperAllergies(patientId: string, antecedents: Antecedents): fhir4.AllergyIntolerance[] {
  return antecedents.allergies.map((allergie, index) => ({
    resourceType: 'AllergyIntolerance',
    id: `${patientId}-allergie-${index}`,
    patient: { reference: `Patient/${patientId}` },
    code: { text: allergie.substance },
    note: allergie.severite ? [{ text: `Sévérité : ${allergie.severite}` }] : undefined,
    onsetDateTime: allergie.dateConstatee?.toISOString(),
  }));
}

export function mapperConditions(patientId: string, antecedents: Antecedents): fhir4.Condition[] {
  const medicales = antecedents.medicaux.map((libelle, index) => ({ libelle, categorie: 'medical', index }));
  const chirurgicales = antecedents.chirurgicaux.map((libelle, index) => ({ libelle, categorie: 'surgical', index }));

  return [...medicales, ...chirurgicales].map(({ libelle, categorie, index }) => ({
    resourceType: 'Condition',
    id: `${patientId}-${categorie}-${index}`,
    subject: { reference: `Patient/${patientId}` },
    code: { text: libelle },
    category: [{ text: categorie }],
  }));
}
