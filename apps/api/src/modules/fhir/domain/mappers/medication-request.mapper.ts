import { PrescriptionStatut } from '@sih-saas/shared';
import { PrescriptionLigneEntity } from '../../../prescriptions/infrastructure/entities/prescription-ligne.entity';
import { PrescriptionEntity } from '../../../prescriptions/infrastructure/entities/prescription.entity';

const STATUT_VERS_FHIR: Record<PrescriptionStatut, fhir4.MedicationRequest['status']> = {
  [PrescriptionStatut.EN_ATTENTE]: 'draft',
  [PrescriptionStatut.VALIDEE]: 'active',
  [PrescriptionStatut.DISPENSEE]: 'completed',
  [PrescriptionStatut.ANNULEE]: 'cancelled',
};

/** Une ressource `MedicationRequest` par ligne — chaque ligne porte sa propre posologie/voie/durée. */
export function mapperMedicationRequests(
  prescription: PrescriptionEntity,
  lignes: PrescriptionLigneEntity[],
): fhir4.MedicationRequest[] {
  return lignes.map((ligne) => ({
    resourceType: 'MedicationRequest',
    id: ligne.id,
    status: STATUT_VERS_FHIR[prescription.statut],
    intent: 'order',
    medicationCodeableConcept: { coding: [{ system: 'urn:sih-saas:medicament', code: ligne.medicamentId }] },
    subject: { reference: `Patient/${prescription.patientId}` },
    requester: { reference: `Practitioner/${prescription.prescripteurId}` },
    authoredOn: prescription.date.toISOString(),
    dosageInstruction: [{ text: `${ligne.posologie} — ${ligne.voie} — ${ligne.duree}` }],
  }));
}
