import type { ObservationEntry } from '../../../dossier-medical/infrastructure/schemas/dossier-medical.schema';
import { mapperObservations } from './observation.mapper';

describe('mapperObservations', () => {
  it('mappe chaque observation en ressource Observation FHIR (status=final)', () => {
    const observations: ObservationEntry[] = [
      { date: new Date('2026-06-01T10:00:00.000Z'), auteurId: 'medecin-1', contenu: 'TA 120/80', type: 'Constantes' },
    ];

    const resultat = mapperObservations('patient-1', observations);

    expect(resultat).toHaveLength(1);
    expect(resultat[0]).toMatchObject({
      resourceType: 'Observation',
      status: 'final',
      code: { text: 'Constantes' },
      subject: { reference: 'Patient/patient-1' },
      performer: [{ reference: 'Practitioner/medecin-1' }],
      valueString: 'TA 120/80',
    });
  });

  it('renvoie un tableau vide sans observation', () => {
    expect(mapperObservations('patient-1', [])).toEqual([]);
  });
});
