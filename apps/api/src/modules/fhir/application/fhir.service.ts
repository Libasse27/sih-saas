import { Injectable } from '@nestjs/common';
import { AdmissionsService } from '../../admissions-lits/application/admissions.service';
import { AuditService } from '../../audit/application/audit.service';
import { ConsultationsService } from '../../consultations/application/consultations.service';
import { DossierMedicalService } from '../../dossier-medical/application/dossier-medical.service';
import { PatientsService } from '../../patients/application/patients.service';
import { PrescriptionsService } from '../../prescriptions/application/prescriptions.service';
import { RendezVousService } from '../../rendez-vous/application/rendez-vous.service';
import { mapperAllergies, mapperConditions } from '../domain/mappers/allergy-condition.mapper';
import { mapperAppointment } from '../domain/mappers/appointment.mapper';
import { mapperAdmissionEnEncounter, mapperConsultationEnEncounter } from '../domain/mappers/encounter.mapper';
import { mapperMedicationRequests } from '../domain/mappers/medication-request.mapper';
import { mapperObservations } from '../domain/mappers/observation.mapper';
import { mapperPatient } from '../domain/mappers/patient.mapper';

const LIMITE_LISTE_PAR_DEFAUT = 100;

/**
 * Lecture seule (export d'interopérabilité) — pas de FHIR bidirectionnel dans cette itération.
 * Chaque méthode passe par les services métier existants (donc par la RLS via tenantContext) :
 * un patient d'un autre établissement que celui de la clé API est simplement introuvable
 * (NotFoundException), sans logique de vérification cross-tenant supplémentaire à écrire ici.
 */
@Injectable()
export class FhirService {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly dossierMedicalService: DossierMedicalService,
    private readonly consultationsService: ConsultationsService,
    private readonly admissionsService: AdmissionsService,
    private readonly prescriptionsService: PrescriptionsService,
    private readonly rendezVousService: RendezVousService,
    private readonly auditService: AuditService,
  ) {}

  async getPatient(id: string, contexte: AuditContext): Promise<fhir4.Patient> {
    const patient = await this.patientsService.findById(id);
    await this.journaliser('Patient', patient.id, contexte);
    return mapperPatient(patient);
  }

  async getPatientParIdentifiant(idh: string, contexte: AuditContext): Promise<fhir4.Patient> {
    const patient = await this.patientsService.findByIdh(idh);
    await this.journaliser('Patient', patient.id, contexte);
    return mapperPatient(patient);
  }

  async getEncountersPourPatient(patientId: string, contexte: AuditContext): Promise<fhir4.Encounter[]> {
    await this.patientsService.findById(patientId);

    const [consultations, admissions] = await Promise.all([
      this.consultationsService.findAll(1, LIMITE_LISTE_PAR_DEFAUT, patientId),
      this.admissionsService.findAll(1, LIMITE_LISTE_PAR_DEFAUT, { patientId }),
    ]);

    await this.journaliser('Encounter', patientId, contexte);
    return [
      ...consultations.items.map(mapperConsultationEnEncounter),
      ...admissions.items.map(mapperAdmissionEnEncounter),
    ];
  }

  async getAllergyIntolerancesPourPatient(patientId: string, contexte: AuditContext): Promise<fhir4.AllergyIntolerance[]> {
    await this.patientsService.findById(patientId);
    const dossier = await this.dossierMedicalService.getOrCreate(patientId);

    await this.journaliser('AllergyIntolerance', patientId, contexte);
    return mapperAllergies(patientId, dossier.antecedents);
  }

  async getConditionsPourPatient(patientId: string, contexte: AuditContext): Promise<fhir4.Condition[]> {
    await this.patientsService.findById(patientId);
    const dossier = await this.dossierMedicalService.getOrCreate(patientId);

    await this.journaliser('Condition', patientId, contexte);
    return mapperConditions(patientId, dossier.antecedents);
  }

  async getObservationsPourPatient(patientId: string, contexte: AuditContext): Promise<fhir4.Observation[]> {
    await this.patientsService.findById(patientId);
    const dossier = await this.dossierMedicalService.getOrCreate(patientId);

    await this.journaliser('Observation', patientId, contexte);
    return mapperObservations(patientId, dossier.observations);
  }

  async getMedicationRequestsPourPatient(patientId: string, contexte: AuditContext): Promise<fhir4.MedicationRequest[]> {
    await this.patientsService.findById(patientId);
    const { items: prescriptions } = await this.prescriptionsService.findByPatient(patientId, 1, LIMITE_LISTE_PAR_DEFAUT);

    const lignesParPrescription = await Promise.all(
      prescriptions.map((prescription) => this.prescriptionsService.findLignes(prescription.id)),
    );

    await this.journaliser('MedicationRequest', patientId, contexte);
    return prescriptions.flatMap((prescription, index) =>
      mapperMedicationRequests(prescription, lignesParPrescription[index]),
    );
  }

  async getAppointmentsPourPatient(patientId: string, contexte: AuditContext): Promise<fhir4.Appointment[]> {
    await this.patientsService.findById(patientId);
    const { items: rendezVous } = await this.rendezVousService.findByPatient(patientId, 1, LIMITE_LISTE_PAR_DEFAUT);

    await this.journaliser('Appointment', patientId, contexte);
    return rendezVous.map(mapperAppointment);
  }

  private async journaliser(ressource: string, ressourceId: string, contexte: AuditContext): Promise<void> {
    await this.auditService.log({
      etablissementId: contexte.etablissementId,
      action: 'fhir.read',
      ressource,
      ressourceId,
      metadata: { apiKeyId: contexte.apiKeyId },
    });
  }
}

export interface AuditContext {
  etablissementId: string;
  apiKeyId: string;
}
