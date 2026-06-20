import type { Antecedents } from '../../../dossier-medical/infrastructure/schemas/dossier-medical.schema';
import { mapperAllergies, mapperConditions } from './allergy-condition.mapper';

describe('mapperAllergies', () => {
  it('mappe chaque allergie en AllergyIntolerance, avec note si sévérité fournie', () => {
    const antecedents: Antecedents = {
      medicaux: [],
      chirurgicaux: [],
      familiaux: [],
      allergies: [
        { substance: 'Pénicilline', severite: 'Sévère', dateConstatee: new Date('2020-01-01') },
        { substance: 'Arachide' },
      ],
    };

    const resultat = mapperAllergies('patient-1', antecedents);

    expect(resultat).toHaveLength(2);
    expect(resultat[0].code).toEqual({ text: 'Pénicilline' });
    expect(resultat[0].note).toEqual([{ text: 'Sévérité : Sévère' }]);
    expect(resultat[1].note).toBeUndefined();
    expect(resultat[1].onsetDateTime).toBeUndefined();
  });

  it('renvoie un tableau vide sans allergie', () => {
    const antecedents: Antecedents = { medicaux: [], chirurgicaux: [], familiaux: [], allergies: [] };
    expect(mapperAllergies('patient-1', antecedents)).toEqual([]);
  });
});

describe('mapperConditions', () => {
  it('mappe les antécédents médicaux et chirurgicaux en Condition, catégorisés', () => {
    const antecedents: Antecedents = {
      medicaux: ['Diabète type 2'],
      chirurgicaux: ['Appendicectomie 2015'],
      familiaux: [],
      allergies: [],
    };

    const resultat = mapperConditions('patient-1', antecedents);

    expect(resultat).toHaveLength(2);
    expect(resultat[0]).toMatchObject({ code: { text: 'Diabète type 2' }, category: [{ text: 'medical' }] });
    expect(resultat[1]).toMatchObject({ code: { text: 'Appendicectomie 2015' }, category: [{ text: 'surgical' }] });
  });
});
