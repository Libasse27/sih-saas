import { Body, Controller, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicalModule, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CareContextGuard } from '../../../shared/guards/care-context.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { UrgencesService } from '../application/urgences.service';
import { ClotureUrgenceDto } from './dto/cloture-urgence.dto';
import { CreateAlerteMedicaleDto } from './dto/create-alerte-medicale.dto';
import { CreateSurveillanceUrgenceDto } from './dto/create-surveillance-urgence.dto';

/**
 * Actions cliniques sur un épisode d'urgence existant — nichée sous /patients/:patientId pour
 * que CareContextGuard résolve le patient via le paramètre de route (même convention que
 * PrescriptionsController). `:patientId` n'est pas réutilisé dans le corps des méthodes : le
 * service retrouve tout depuis `:id` (l'urgence elle-même), la RLS garantit déjà la cohérence
 * tenant entre les deux.
 */
@ApiTags('Urgences')
@ApiBearerAuth()
@Controller('patients/:patientId/urgences')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ClinicalModule.URGENCES)
export class UrgencesPatientController {
  constructor(private readonly urgencesService: UrgencesService) {}

  @Patch(':id/prise-en-charge')
  @RequirePermissions(Permission.URGENCE_PRISE_EN_CHARGE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Patient pris en charge.')
  priseEnCharge(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.urgencesService.priseEnCharge(id, currentUser.sub);
  }

  @Post(':id/surveillances')
  @RequirePermissions(Permission.URGENCE_SURVEILLANCE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Relevé de surveillance enregistré.')
  ajouterSurveillance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSurveillanceUrgenceDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.urgencesService.ajouterSurveillance(id, dto, currentUser.sub);
  }

  @Post(':id/alertes')
  @RequirePermissions(Permission.URGENCE_ALERTE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Alerte médicale levée.')
  creerAlerte(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAlerteMedicaleDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.urgencesService.creerAlerte(id, dto, currentUser.sub);
  }

  @Patch(':id/alertes/:alerteId/acquitter')
  @RequirePermissions(Permission.URGENCE_ALERTE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Alerte acquittée.')
  acquitterAlerte(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('alerteId', ParseUUIDPipe) alerteId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.urgencesService.acquitterAlerte(id, alerteId, currentUser.sub);
  }

  @Patch(':id/cloture')
  @RequirePermissions(Permission.URGENCE_PRISE_EN_CHARGE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Épisode aux urgences clôturé.')
  cloturer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ClotureUrgenceDto, @CurrentUser() currentUser: JwtPayload) {
    return this.urgencesService.cloturer(id, dto, currentUser.sub);
  }
}
