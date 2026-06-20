export function construireBundle(resources: fhir4.FhirResource[]): fhir4.Bundle {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: resources.length,
    entry: resources.map((resource) => ({ resource })),
  };
}
