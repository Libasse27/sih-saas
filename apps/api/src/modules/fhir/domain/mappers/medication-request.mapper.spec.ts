import { PrescriptionStatut } from '@sih-saas/shared';
import { PrescriptionLigneEntity } from '../../../prescriptions/infrastructure/entities/prescription-ligne.entity';
import { PrescriptionEntity } from '../../../prescriptions/infrastructure/entities/prescription.entity';
import { mapperMedicationRequests } from './medication-request.mapper';

describe('mapperMedicationRequests', () => {
  const prescription: PrescriptionEntity = {
    id: 'prescription-1',
    etablissementId: 'etab-1',
    patientId: 'patient-1',
    consultationId: null,
    prescripteurId: 'medecin-1',
    date: new Date('2026-06-01T10:00:00.000Z'),
    statut: PrescriptionStatut.VALIDEE,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const ligne: PrescriptionLigneEntity = {
    id: 'ligne-1',
    etablissementId: 'etab-1',
    prescriptionId: 'prescription-1',
    medicamentId: 'medicament-1',
    posologie: '1 comprimé matin et soir',
    duree: '7 jours',
    voie: 'orale',
    createdAt: new Date(),
  };

  it('mappe une ligne par MedicationRequest, status dérivé du statut de la prescription', () => {
    const resultat = mapperMedicationRequests(prescription, [ligne]);

    expect(resultat).toHaveLength(1);
    expect(resultat[0]).toMatchObject({
      resourceType: 'MedicationRequest',
      status: 'active',
      intent: 'order',
      subject: { reference: 'Patient/patient-1' },
      requester: { reference: 'Practitioner/medecin-1' },
      dosageInstruction: [{ text: '1 comprimé matin et soir — orale — 7 jours' }],
    });
  });

  it('mappe chaque statut de prescription vers le status FHIR attendu', () => {
    expect(mapperMedicationRequests({ ...prescription, statut: PrescriptionStatut.EN_ATTENTE }, [ligne])[0].status).toBe('draft');
    expect(mapperMedicationRequests({ ...prescription, statut: PrescriptionStatut.DISPENSEE }, [ligne])[0].status).toBe('completed');
    expect(mapperMedicationRequests({ ...prescription, statut: PrescriptionStatut.ANNULEE }, [ligne])[0].status).toBe('cancelled');
  });

  it('renvoie un tableau vide sans ligne', () => {
    expect(mapperMedicationRequests(prescription, [])).toEqual([]);
  });
});
