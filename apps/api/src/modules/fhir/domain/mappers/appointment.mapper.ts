import { RendezVousStatut } from '@sih-saas/shared';
import { RendezVousEntity } from '../../../rendez-vous/infrastructure/entities/rendez-vous.entity';

const STATUT_VERS_FHIR: Record<RendezVousStatut, fhir4.Appointment['status']> = {
  [RendezVousStatut.PLANIFIE]: 'booked',
  [RendezVousStatut.CONFIRME]: 'booked',
  [RendezVousStatut.TERMINE]: 'fulfilled',
  [RendezVousStatut.ANNULE]: 'cancelled',
  [RendezVousStatut.NO_SHOW]: 'noshow',
};

export function mapperAppointment(rdv: RendezVousEntity): fhir4.Appointment {
  const fin = new Date(rdv.dateHeure.getTime() + rdv.dureeMin * 60_000);

  return {
    resourceType: 'Appointment',
    id: rdv.id,
    status: STATUT_VERS_FHIR[rdv.statut],
    start: rdv.dateHeure.toISOString(),
    end: fin.toISOString(),
    comment: rdv.motif ?? undefined,
    participant: [
      { actor: { reference: `Patient/${rdv.patientId}` }, status: 'accepted' },
      { actor: { reference: `Practitioner/${rdv.praticienId}` }, status: 'accepted' },
    ],
  };
}
