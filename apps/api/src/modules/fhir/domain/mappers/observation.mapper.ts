import type { ObservationEntry } from '../../../dossier-medical/infrastructure/schemas/dossier-medical.schema';

export function mapperObservations(patientId: string, observations: ObservationEntry[]): fhir4.Observation[] {
  return observations.map((observation, index) => ({
    resourceType: 'Observation',
    id: `${patientId}-observation-${index}`,
    status: 'final',
    code: { text: observation.type },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: observation.date.toISOString(),
    performer: [{ reference: `Practitioner/${observation.auteurId}` }],
    valueString: observation.contenu,
  }));
}
