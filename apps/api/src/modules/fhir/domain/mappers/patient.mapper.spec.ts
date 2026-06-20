import { Sexe } from '@sih-saas/shared';
import { PatientEntity } from '../../../patients/infrastructure/entities/patient.entity';
import { mapperPatient } from './patient.mapper';

describe('mapperPatient', () => {
  const base: PatientEntity = {
    id: 'patient-1',
    etablissementId: 'etab-1',
    idh: 'CLIN-2026-000001',
    userId: null,
    nom: 'Sow',
    prenom: 'Moussa',
    dateNaissance: '1990-05-12',
    sexe: Sexe.M,
    telephone: '+221770000000',
    adresse: 'Dakar',
    assuranceId: null,
    contactUrgence: null,
    consentements: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  it('mappe les champs nominaux vers une ressource Patient FHIR R4', () => {
    const resultat = mapperPatient(base);

    expect(resultat).toMatchObject({
      resourceType: 'Patient',
      id: 'patient-1',
      identifier: [{ system: 'urn:sih-saas:idh', value: 'CLIN-2026-000001' }],
      name: [{ family: 'Sow', given: ['Moussa'] }],
      gender: 'male',
      birthDate: '1990-05-12',
      telecom: [{ system: 'phone', value: '+221770000000' }],
      address: [{ text: 'Dakar' }],
    });
  });

  it('omet telecom/address quand téléphone/adresse sont absents, gender=female pour Sexe.F', () => {
    const resultat = mapperPatient({ ...base, sexe: Sexe.F, telephone: null, adresse: null });

    expect(resultat.gender).toBe('female');
    expect(resultat.telecom).toBeUndefined();
    expect(resultat.address).toBeUndefined();
  });
});
