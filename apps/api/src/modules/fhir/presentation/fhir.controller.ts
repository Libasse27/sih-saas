import { BadRequestException, Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicalModule, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RawResponse } from '../../../shared/decorators/raw-response.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { AuditContext, FhirService } from '../application/fhir.service';
import { construireBundle } from '../domain/mappers/bundle.mapper';

/**
 * Lecture seule, authentification par clé API uniquement (jamais un compte humain — voir
 * JwtAuthGuard). `Scope.ETABLISSEMENT` ici correspond toujours à une clé API (le format
 * `request.user` posé par JwtAuthGuard pour ce cas), jamais à un JWT de membre du personnel.
 * `@RawResponse()` : un client FHIR attend la ressource/le Bundle à la racine du corps de réponse,
 * jamais l'enveloppe `{success,data,message}` imposée ailleurs dans l'API.
 */
@ApiTags('FHIR R4 (lecture)')
@ApiBearerAuth()
@Controller('fhir')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ClinicalModule.API)
@RequirePermissions(Permission.FHIR_READ)
@RawResponse()
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  @Get('Patient')
  findPatientByIdentifier(@Query('identifier') identifier: string, @CurrentUser() currentUser: JwtPayload) {
    if (!identifier) {
      throw new BadRequestException('Le paramètre "identifier" est requis.');
    }
    return this.fhirService.getPatientParIdentifiant(identifier, this.contexte(currentUser));
  }

  @Get('Patient/:id')
  findPatient(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.fhirService.getPatient(id, this.contexte(currentUser));
  }

  @Get('Encounter')
  async findEncounters(@Query('patient', ParseUUIDPipe) patientId: string, @CurrentUser() currentUser: JwtPayload) {
    const resources = await this.fhirService.getEncountersPourPatient(patientId, this.contexte(currentUser));
    return construireBundle(resources);
  }

  @Get('AllergyIntolerance')
  async findAllergyIntolerances(@Query('patient', ParseUUIDPipe) patientId: string, @CurrentUser() currentUser: JwtPayload) {
    const resources = await this.fhirService.getAllergyIntolerancesPourPatient(patientId, this.contexte(currentUser));
    return construireBundle(resources);
  }

  @Get('Condition')
  async findConditions(@Query('patient', ParseUUIDPipe) patientId: string, @CurrentUser() currentUser: JwtPayload) {
    const resources = await this.fhirService.getConditionsPourPatient(patientId, this.contexte(currentUser));
    return construireBundle(resources);
  }

  @Get('Observation')
  async findObservations(@Query('patient', ParseUUIDPipe) patientId: string, @CurrentUser() currentUser: JwtPayload) {
    const resources = await this.fhirService.getObservationsPourPatient(patientId, this.contexte(currentUser));
    return construireBundle(resources);
  }

  @Get('MedicationRequest')
  async findMedicationRequests(@Query('patient', ParseUUIDPipe) patientId: string, @CurrentUser() currentUser: JwtPayload) {
    const resources = await this.fhirService.getMedicationRequestsPourPatient(patientId, this.contexte(currentUser));
    return construireBundle(resources);
  }

  @Get('Appointment')
  async findAppointments(@Query('patient', ParseUUIDPipe) patientId: string, @CurrentUser() currentUser: JwtPayload) {
    const resources = await this.fhirService.getAppointmentsPourPatient(patientId, this.contexte(currentUser));
    return construireBundle(resources);
  }

  @Get('Practitioner/:id')
  findPractitioner(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.fhirService.getPractitioner(id, this.contexte(currentUser));
  }

  @Get('DiagnosticReport')
  async findDiagnosticReports(@Query('patient', ParseUUIDPipe) patientId: string, @CurrentUser() currentUser: JwtPayload) {
    const resources = await this.fhirService.getDiagnosticReportsPourPatient(patientId, this.contexte(currentUser));
    return construireBundle(resources);
  }

  private contexte(currentUser: JwtPayload): AuditContext {
    return { etablissementId: currentUser.etablissementId!, apiKeyId: currentUser.sub };
  }
}
