import { AdmissionStatut } from '@sih-saas/shared';
import { AdmissionEntity } from '../../../admissions-lits/infrastructure/entities/admission.entity';
import { ConsultationEntity } from '../../../consultations/infrastructure/entities/consultation.entity';

const STATUT_ADMISSION_VERS_FHIR: Record<AdmissionStatut, fhir4.Encounter['status']> = {
  [AdmissionStatut.EN_COURS]: 'in-progress',
  [AdmissionStatut.TERMINEE]: 'finished',
  [AdmissionStatut.ANNULEE]: 'cancelled',
};

export function mapperConsultationEnEncounter(consultation: ConsultationEntity): fhir4.Encounter {
  return {
    resourceType: 'Encounter',
    id: consultation.id,
    status: 'finished',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
    subject: { reference: `Patient/${consultation.patientId}` },
    participant: [{ individual: { reference: `Practitioner/${consultation.praticienId}` } }],
    period: { start: consultation.date.toISOString() },
    reasonCode: [{ text: consultation.motif }],
  };
}

export function mapperAdmissionEnEncounter(admission: AdmissionEntity): fhir4.Encounter {
  return {
    resourceType: 'Encounter',
    id: admission.id,
    status: STATUT_ADMISSION_VERS_FHIR[admission.statut],
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: 'inpatient encounter' },
    subject: { reference: `Patient/${admission.patientId}` },
    participant: [{ individual: { reference: `Practitioner/${admission.medecinReferentId}` } }],
    period: {
      start: admission.dateAdmission.toISOString(),
      end: admission.dateSortieReelle?.toISOString(),
    },
    reasonCode: [{ text: admission.motif }],
  };
}
