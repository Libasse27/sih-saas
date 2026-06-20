import { CanalRdv, RendezVousStatut } from '@sih-saas/shared';
import { RendezVousEntity } from '../../../rendez-vous/infrastructure/entities/rendez-vous.entity';
import { mapperAppointment } from './appointment.mapper';

describe('mapperAppointment', () => {
  const base: RendezVousEntity = {
    id: 'rdv-1',
    etablissementId: 'etab-1',
    patientId: 'patient-1',
    praticienId: 'medecin-1',
    serviceId: null,
    dateHeure: new Date('2026-07-01T09:30:00.000Z'),
    dureeMin: 30,
    motif: 'Consultation generale',
    statut: RendezVousStatut.PLANIFIE,
    canal: CanalRdv.SUR_SITE,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  it('calcule end = start + dureeMin et mappe les deux participants', () => {
    const resultat = mapperAppointment(base);

    expect(resultat.start).toBe('2026-07-01T09:30:00.000Z');
    expect(resultat.end).toBe('2026-07-01T10:00:00.000Z');
    expect(resultat.participant).toEqual([
      { actor: { reference: 'Patient/patient-1' }, status: 'accepted' },
      { actor: { reference: 'Practitioner/medecin-1' }, status: 'accepted' },
    ]);
  });

  it('mappe chaque statut RDV vers le status FHIR Appointment attendu', () => {
    expect(mapperAppointment({ ...base, statut: RendezVousStatut.TERMINE }).status).toBe('fulfilled');
    expect(mapperAppointment({ ...base, statut: RendezVousStatut.ANNULE }).status).toBe('cancelled');
    expect(mapperAppointment({ ...base, statut: RendezVousStatut.NO_SHOW }).status).toBe('noshow');
  });

  it('comment est undefined quand motif est null', () => {
    expect(mapperAppointment({ ...base, motif: null }).comment).toBeUndefined();
  });
});
