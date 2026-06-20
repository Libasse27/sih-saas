import { AdmissionStatut } from '@sih-saas/shared';
import { AdmissionEntity } from '../../../admissions-lits/infrastructure/entities/admission.entity';
import { ConsultationEntity } from '../../../consultations/infrastructure/entities/consultation.entity';
import { mapperAdmissionEnEncounter, mapperConsultationEnEncounter } from './encounter.mapper';

describe('mapperConsultationEnEncounter', () => {
  it('mappe une consultation en Encounter ambulatoire (status=finished)', () => {
    const consultation = {
      id: 'consult-1',
      etablissementId: 'etab-1',
      patientId: 'patient-1',
      praticienId: 'medecin-1',
      rendezVousId: null,
      admissionId: null,
      date: new Date('2026-06-01T09:00:00.000Z'),
      motif: 'Consultation generale',
      examenClinique: null,
      diagnosticCim10: null,
      conclusion: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as ConsultationEntity;

    const resultat = mapperConsultationEnEncounter(consultation);

    expect(resultat.resourceType).toBe('Encounter');
    expect(resultat.status).toBe('finished');
    expect(resultat.subject).toEqual({ reference: 'Patient/patient-1' });
    expect(resultat.participant?.[0]).toEqual({ individual: { reference: 'Practitioner/medecin-1' } });
    expect(resultat.class?.code).toBe('AMB');
  });
});

describe('mapperAdmissionEnEncounter', () => {
  const base: AdmissionEntity = {
    id: 'admission-1',
    etablissementId: 'etab-1',
    patientId: 'patient-1',
    litId: 'lit-1',
    serviceId: 'service-1',
    medecinReferentId: 'medecin-1',
    motif: 'Surveillance',
    dateAdmission: new Date('2026-06-01T08:00:00.000Z'),
    dateSortiePrevue: null,
    dateSortieReelle: null,
    statut: AdmissionStatut.EN_COURS,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  it('mappe une admission EN_COURS en Encounter inpatient sans date de fin', () => {
    const resultat = mapperAdmissionEnEncounter(base);

    expect(resultat.status).toBe('in-progress');
    expect(resultat.class?.code).toBe('IMP');
    expect(resultat.period?.end).toBeUndefined();
  });

  it('mappe une admission TERMINEE avec la date de sortie réelle', () => {
    const resultat = mapperAdmissionEnEncounter({
      ...base,
      statut: AdmissionStatut.TERMINEE,
      dateSortieReelle: new Date('2026-06-05T10:00:00.000Z'),
    });

    expect(resultat.status).toBe('finished');
    expect(resultat.period?.end).toBe('2026-06-05T10:00:00.000Z');
  });
});
