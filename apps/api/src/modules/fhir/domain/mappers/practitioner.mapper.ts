import { UserEntity } from '../../../users/infrastructure/entities/user.entity';

/** Comble les références `Practitioner/{id}` déjà émises par les autres mappers (Observation, MedicationRequest, Appointment...) — jamais matérialisées jusqu'ici (gap audit 2026-06-21). */
export function mapperPractitioner(user: UserEntity): fhir4.Practitioner {
  return {
    resourceType: 'Practitioner',
    id: user.id,
    name: [{ family: user.nom, given: [user.prenom] }],
    telecom: [
      ...(user.email ? [{ system: 'email' as const, value: user.email }] : []),
      ...(user.telephone ? [{ system: 'phone' as const, value: user.telephone }] : []),
    ],
  };
}
