import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicalModule, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { isUUID } from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PatientsService } from '../../patients/application/patients.service';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { FacturesPatientService } from '../application/factures-patient.service';
import { CreateFacturePatientDto } from './dto/create-facture-patient.dto';

/** Pas de CareContextGuard : `facture-patient:create` n'est pas 🩺 dans la matrice RBAC (voir plan Phase 8). */
@ApiTags('Facturation patient — Factures')
@ApiBearerAuth()
@Controller('patients/:patientId/factures-patient')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ClinicalModule.FACTURATION)
@RequirePermissions(Permission.FACTURE_PATIENT_CREATE)
export class FacturesPatientController {
  constructor(
    private readonly facturesPatientService: FacturesPatientService,
    private readonly patientsService: PatientsService,
  ) {}

  @Post()
  @ResponseMessage('Facture créée, part assurance/reste à charge calculés.')
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateFacturePatientDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.facturesPatientService.create(patientId, dto, currentUser.sub);
  }

  /**
   * `:patientId` vaut littéralement `me` pour un patient (route `/patients/me/factures-patient`
   * vue côté mobile) — pas de second contrôleur possible sur ce chemin (collision avec ce
   * paramètre), donc on branche ici. `@RequirePermissions()` neutralise FACTURE_PATIENT_CREATE
   * (sans objet pour une lecture patient) ; vérifiée manuellement pour la branche ETABLISSEMENT.
   */
  @Get()
  @Scopes(Scope.ETABLISSEMENT, Scope.PATIENT)
  @RequirePermissions()
  @ResponseMessage('Factures du patient.')
  async findAll(
    @Param('patientId') patientId: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    if (currentUser.scope === Scope.PATIENT) {
      const patient = await this.patientsService.findByUserId(currentUser.sub);
      if (!patient) {
        throw new NotFoundException('Aucun dossier patient associé à ce compte.');
      }
      return this.facturesPatientService.findByPatient(patient.id, query.page, query.limit);
    }

    if (!currentUser.permissions.includes(Permission.FACTURE_PATIENT_CREATE)) {
      throw new ForbiddenException('Accès refusé : permission manquante pour cette action.');
    }
    if (!isUUID(patientId)) {
      throw new BadRequestException('Identifiant patient invalide.');
    }
    return this.facturesPatientService.findByPatient(patientId, query.page, query.limit);
  }
}
