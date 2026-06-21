import { DemandeStatut } from '@sih-saas/shared';
import { CompteRenduImagerieEntity } from '../../../imagerie/infrastructure/entities/compte-rendu-imagerie.entity';
import { DemandeImagerieEntity } from '../../../imagerie/infrastructure/entities/demande-imagerie.entity';
import { DemandeAnalyseEntity } from '../../../laboratoire/infrastructure/entities/demande-analyse.entity';
import { ResultatAnalyseEntity } from '../../../laboratoire/infrastructure/entities/resultat-analyse.entity';
import {
  mapperComptesRendusImagerieEnDiagnosticReport,
  mapperResultatsAnalyseEnDiagnosticReport,
} from './diagnostic-report.mapper';

describe('mapperResultatsAnalyseEnDiagnosticReport', () => {
  const demande: DemandeAnalyseEntity = {
    id: 'demande-1',
    etablissementId: 'etab-1',
    patientId: 'patient-1',
    prescripteurId: 'medecin-1',
    typeAnalyse: 'Glycémie',
    urgence: false,
    statut: DemandeStatut.TERMINEE,
    dateDemande: new Date('2026-06-01T08:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const resultat: ResultatAnalyseEntity = {
    id: 'resultat-1',
    etablissementId: 'etab-1',
    demandeId: 'demande-1',
    biologisteId: 'biologiste-1',
    resultats: { glycemie: '5.2 mmol/L' },
    valeursCritiques: false,
    dateValidation: new Date('2026-06-01T14:00:00Z'),
    fichierUrl: 'https://files.sih-saas.sn/resultats/resultat-1.pdf',
    createdAt: new Date(),
  };

  it('mappe une demande+résultat de labo vers DiagnosticReport (status toujours final)', () => {
    const [resource] = mapperResultatsAnalyseEnDiagnosticReport([demande], [resultat]);

    expect(resource).toMatchObject({
      resourceType: 'DiagnosticReport',
      id: 'resultat-1',
      status: 'final',
      code: { text: 'Glycémie' },
      subject: { reference: 'Patient/patient-1' },
      performer: [{ reference: 'Practitioner/biologiste-1' }],
      effectiveDateTime: '2026-06-01T08:00:00.000Z',
      issued: '2026-06-01T14:00:00.000Z',
      presentedForm: [{ url: 'https://files.sih-saas.sn/resultats/resultat-1.pdf' }],
    });
    expect(resource.conclusion).toBeUndefined();
  });

  it('ajoute une conclusion d’alerte quand valeursCritiques est vrai', () => {
    const [resource] = mapperResultatsAnalyseEnDiagnosticReport([demande], [{ ...resultat, valeursCritiques: true }]);

    expect(resource.conclusion).toBe('Valeurs critiques détectées.');
  });
});

describe('mapperComptesRendusImagerieEnDiagnosticReport', () => {
  const demande: DemandeImagerieEntity = {
    id: 'demande-imagerie-1',
    etablissementId: 'etab-1',
    patientId: 'patient-1',
    prescripteurId: 'medecin-1',
    typeExamen: 'Radiographie thorax',
    urgence: false,
    statut: DemandeStatut.TERMINEE,
    dateDemande: new Date('2026-06-02T08:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const compteRendu: CompteRenduImagerieEntity = {
    id: 'compte-rendu-1',
    etablissementId: 'etab-1',
    demandeId: 'demande-imagerie-1',
    radiologueId: 'radiologue-1',
    conclusion: 'Pas d’anomalie détectée.',
    fichierDicomUrl: null,
    dateValidation: new Date('2026-06-02T16:00:00Z'),
    createdAt: new Date(),
  };

  it('mappe une demande+compte rendu d’imagerie vers DiagnosticReport', () => {
    const [resource] = mapperComptesRendusImagerieEnDiagnosticReport([demande], [compteRendu]);

    expect(resource).toMatchObject({
      resourceType: 'DiagnosticReport',
      id: 'compte-rendu-1',
      status: 'final',
      code: { text: 'Radiographie thorax' },
      subject: { reference: 'Patient/patient-1' },
      performer: [{ reference: 'Practitioner/radiologue-1' }],
      conclusion: 'Pas d’anomalie détectée.',
    });
    expect(resource.presentedForm).toBeUndefined();
  });
});
