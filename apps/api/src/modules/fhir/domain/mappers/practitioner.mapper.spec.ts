import { Scope } from '@sih-saas/shared';
import { UserEntity } from '../../../users/infrastructure/entities/user.entity';
import { mapperPractitioner } from './practitioner.mapper';

describe('mapperPractitioner', () => {
  const base: UserEntity = {
    id: 'medecin-1',
    scope: Scope.ETABLISSEMENT,
    etablissementId: 'etab-1',
    serviceId: null,
    nom: 'Diop',
    prenom: 'Awa',
    email: 'awa.diop@clinique.sn',
    telephone: '+221770000001',
    passwordHash: 'hash',
    mfaEnabled: false,
    mfaSecret: null,
    dernierLogin: null,
    tentativesEchouees: 0,
    verrouilleJusqua: null,
    userRoles: [],
    userPermissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  it('mappe nom/prénom/contacts vers une ressource Practitioner FHIR R4', () => {
    const resultat = mapperPractitioner(base);

    expect(resultat).toMatchObject({
      resourceType: 'Practitioner',
      id: 'medecin-1',
      name: [{ family: 'Diop', given: ['Awa'] }],
      telecom: [
        { system: 'email', value: 'awa.diop@clinique.sn' },
        { system: 'phone', value: '+221770000001' },
      ],
    });
  });

  it('omet le téléphone du telecom quand absent', () => {
    const resultat = mapperPractitioner({ ...base, telephone: null });

    expect(resultat.telecom).toEqual([{ system: 'email', value: 'awa.diop@clinique.sn' }]);
  });
});
