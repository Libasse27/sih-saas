import { construireBundle } from './bundle.mapper';

describe('construireBundle', () => {
  it('enveloppe les ressources dans un Bundle searchset avec le total', () => {
    const resultat = construireBundle([{ resourceType: 'Patient', id: 'p1' } as fhir4.Patient]);

    expect(resultat).toEqual({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 1,
      entry: [{ resource: { resourceType: 'Patient', id: 'p1' } }],
    });
  });

  it('renvoie un Bundle vide (total=0) pour une liste vide', () => {
    expect(construireBundle([])).toMatchObject({ resourceType: 'Bundle', total: 0, entry: [] });
  });
});
