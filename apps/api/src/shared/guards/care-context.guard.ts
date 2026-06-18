import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtPayload } from '@sih-saas/shared';
import { AuditService } from '../../modules/audit/application/audit.service';
import { PatientsService } from '../../modules/patients/application/patients.service';

/**
 * Contrôle clinique interne (orthogonal à l'isolation tenant) — prompt maître §5 et
 * docs/phase-0/strategie-isolation.md §5. La RLS a déjà filtré le patient par établissement ;
 * ce guard ajoute une défense en profondeur explicite (vérification applicative) et surtout
 * la journalisation systématique exigée pour tout accès au dossier médical, succès ou refus.
 *
 * Le « lien de soin » fin (médecin référent d'une admission, service d'affectation) ne pourra
 * être vérifié qu'à partir de la Phase 6 (Admissions) — pour l'instant, avoir la permission
 * `dossier:read`/`dossier:write` (déjà vérifiée par PermissionsGuard) + appartenir au même
 * établissement est la seule garantie disponible. Ce guard sera étendu, pas remplacé, alors.
 */
@Injectable()
export class CareContextGuard implements CanActivate {
  constructor(
    private readonly patientsService: PatientsService,
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
      await this.auditService.log({
        etablissementId: user.etablissementId,
        userId: user.sub,
        action: 'dossier.access.denied',
        ressource: 'dossier_medical',
        ressourceId: patientId,
        metadata: { raison: 'patient_introuvable' },
      });
      throw error;
    }

    if (patient.etablissementId !== user.etablissementId) {
      await this.auditService.log({
        etablissementId: user.etablissementId,
        userId: user.sub,
        action: 'dossier.access.denied',
        ressource: 'dossier_medical',
        ressourceId: patientId,
        metadata: { raison: 'etablissement_different' },
      });
      throw new ForbiddenException("Ce patient n'appartient pas à votre établissement.");
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
}
