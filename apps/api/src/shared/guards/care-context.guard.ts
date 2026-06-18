import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtPayload } from '@sih-saas/shared';
import { AdmissionsService } from '../../modules/admissions-lits/application/admissions.service';
import { AuditService } from '../../modules/audit/application/audit.service';
import { PatientsService } from '../../modules/patients/application/patients.service';
import { RendezVousService } from '../../modules/rendez-vous/application/rendez-vous.service';

/**
 * Contrôle clinique interne (orthogonal à l'isolation tenant) — prompt maître §5 et
 * docs/phase-0/strategie-isolation.md §5. La RLS a déjà filtré le patient par établissement ;
 * ce guard ajoute une défense en profondeur explicite (vérification applicative) et surtout
 * la journalisation systématique exigée pour tout accès au dossier médical, succès ou refus.
 *
 * Lien de soin (Phase 6, étend la version Phase 5 — ne la remplace pas) :
 * 1. Si le patient n'a AUCUNE admission `EN_COURS` : comportement Phase 5 inchangé (même
 *    établissement = autorisé) — ne bloque pas le tout premier contact (ex. accueil crée le
 *    patient, le médecin rédige une première observation avant tout RDV/admission).
 * 2. Sinon (admission en cours) : autorisé si l'appelant est le médecin référent de l'admission,
 *    OU s'il est affecté (UserEntity.serviceId) au service où le patient est hospitalisé,
 *    OU s'il existe un RendezVous entre cet appelant et ce patient (intervention explicite).
 *    Si aucune de ces conditions n'est remplie -> 403, c'est le vrai durcissement de cette phase.
 */
@Injectable()
export class CareContextGuard implements CanActivate {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly admissionsService: AdmissionsService,
    private readonly rendezVousService: RendezVousService,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    const patientId = request.params.patientId ?? request.params.id;

    if (!patientId) {
      throw new InternalServerErrorException(
        'CareContextGuard requiert un paramètre de route :patientId ou :id.',
      );
    }

    let patient;
    try {
      patient = await this.patientsService.findById(patientId);
    } catch (error) {
      await this.journaliserRefus(user, patientId, 'patient_introuvable');
      throw error;
    }

    if (patient.etablissementId !== user.etablissementId) {
      await this.journaliserRefus(user, patientId, 'etablissement_different');
      throw new ForbiddenException("Ce patient n'appartient pas à votre établissement.");
    }

    if (!(await this.aUnLienDeSoinActif(user, patientId))) {
      await this.journaliserRefus(user, patientId, 'lien_de_soin_absent');
      throw new ForbiddenException("Aucun lien de soin actif avec ce patient.");
    }

    await this.auditService.log({
      etablissementId: user.etablissementId,
      userId: user.sub,
      action: 'dossier.access.allowed',
      ressource: 'dossier_medical',
      ressourceId: patientId,
    });

    request.patient = patient;
    return true;
  }

  private async aUnLienDeSoinActif(user: JwtPayload, patientId: string): Promise<boolean> {
    const admission = await this.admissionsService.findAdmissionEnCoursPourPatient(patientId);

    // Jamais hospitalisé (ou sortie déjà enregistrée) : pas de durcissement, voir docstring ci-dessus.
    if (!admission) {
      return true;
    }

    if (admission.medecinReferentId === user.sub) {
      return true;
    }

    if (user.serviceId && user.serviceId === admission.serviceId) {
      return true;
    }

    return this.rendezVousService.existeRdvEntrePraticienEtPatient(user.sub, patientId);
  }

  private async journaliserRefus(user: JwtPayload, patientId: string, raison: string): Promise<void> {
    await this.auditService.log({
      etablissementId: user.etablissementId,
      userId: user.sub,
      action: 'dossier.access.denied',
      ressource: 'dossier_medical',
      ressourceId: patientId,
      metadata: { raison },
    });
  }
}
