import { Sexe } from '@sih-saas/shared';
import { PatientEntity } from '../../../patients/infrastructure/entities/patient.entity';

export function mapperPatient(patient: PatientEntity): fhir4.Patient {
  return {
    resourceType: 'Patient',
    id: patient.id,
    identifier: [{ system: 'urn:sih-saas:idh', value: patient.idh }],
    name: [{ family: patient.nom, given: [patient.prenom] }],
    gender: patient.sexe === Sexe.M ? 'male' : 'female',
    birthDate: patient.dateNaissance,
    telecom: patient.telephone ? [{ system: 'phone', value: patient.telephone }] : undefined,
    address: patient.adresse ? [{ text: patient.adresse }] : undefined,
  };
}
