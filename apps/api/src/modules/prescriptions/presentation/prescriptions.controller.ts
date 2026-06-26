import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CareContextGuard } from '../../../shared/guards/care-context.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { PrescriptionsService } from '../application/prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';

/** Nichée sous /patients/:patientId — CareContextGuard résout le patient via le paramètre de route (cf. ConsultationsController, Phase 6). */
@ApiTags('Prescriptions')
@ApiBearerAuth()
@Controller('patients/:patientId/prescriptions')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.CONSULTATIONS_MEDICALES)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @RequirePermissions(Permission.PRESCRIPTION_CREATE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Prescription créée.')
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.prescriptionsService.create(patientId, dto, currentUser.sub);
  }

  /**
   * Pas de @RequirePermissions : OR (PRESCRIPTION_CREATE | DISPENSATION_CREATE) impossible à
   * exprimer avec ce décorateur (ET logique, voir permissions.guard.ts) — vérifié manuellement
   * ci-dessous, même pattern que UsersController.assertAnnuairePersonnelAccess. Le pharmacien doit
   * voir les prescriptions d'un patient pour savoir quoi dispenser, sans jamais pouvoir lui-même en
   * créer ou les valider. CareContextGuard reste actif pour les deux rôles (inchangé).
   */
  @Get()
  @UseGuards(CareContextGuard)
  @ResponseMessage('Prescriptions du patient.')
  findAll(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    this.assertAccesLecture(currentUser);
    return this.prescriptionsService.findByPatient(patientId, query.page, query.limit);
  }

  /** Même OR (PRESCRIPTION_CREATE | DISPENSATION_CREATE) que findAll, vérifié manuellement — le pharmacien ouvre le détail d'une prescription pour la dispenser. */
  @Get(':id')
  @UseGuards(CareContextGuard)
  @ResponseMessage('Prescription récupérée.')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    this.assertAccesLecture(currentUser);
    const prescription = await this.prescriptionsService.findById(id);
    const lignes = await this.prescriptionsService.findLignes(id);
    return { ...prescription, lignes };
  }

  @Patch(':id/valider')
  @RequirePermissions(Permission.PRESCRIPTION_VALIDATE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Prescription validée.')
  valider(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.prescriptionsService.valider(id, currentUser.sub);
  }

  @Patch(':id/annuler')
  @RequirePermissions(Permission.PRESCRIPTION_VALIDATE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Prescription annulée.')
  annuler(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.prescriptionsService.annuler(id, currentUser.sub);
  }

  /** OR (PRESCRIPTION_CREATE | DISPENSATION_CREATE), impossible à exprimer avec @RequirePermissions (ET logique). */
  private assertAccesLecture(user: JwtPayload): void {
    if (!user.permissions.includes(Permission.PRESCRIPTION_CREATE) && !user.permissions.includes(Permission.DISPENSATION_CREATE)) {
      throw new ForbiddenException('Accès refusé : permission manquante pour cette action.');
    }
  }
}
