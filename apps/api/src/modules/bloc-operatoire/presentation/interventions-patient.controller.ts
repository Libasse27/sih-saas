import { Body, Controller, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CareContextGuard } from '../../../shared/guards/care-context.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { InterventionsService } from '../application/interventions.service';
import { CreateAnesthesieDto } from './dto/create-anesthesie.dto';
import { CreateCompteRenduOperatoireDto } from './dto/create-compte-rendu-operatoire.dto';
import { CreateConsommableInterventionDto } from './dto/create-consommable-intervention.dto';
import { CreateSurveillanceAnesthesieDto } from './dto/create-surveillance-anesthesie.dto';
import { ValiderChecklistDto } from './dto/valider-checklist.dto';

/**
 * Actions cliniques sur une intervention existante — nichée sous /patients/:patientId pour que
 * CareContextGuard résolve le patient via le paramètre de route (même convention que
 * UrgencesPatientController). `:patientId` n'est pas réutilisé dans le corps des méthodes : le
 * service retrouve tout depuis `:id`, la RLS garantit déjà la cohérence tenant entre les deux.
 */
@ApiTags('Bloc Opératoire')
@ApiBearerAuth()
@Controller('patients/:patientId/interventions')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.BLOC_OPERATOIRE)
export class InterventionsPatientController {
  constructor(private readonly interventionsService: InterventionsService) {}

  @Patch(':id/demarrer')
  @RequirePermissions(Permission.BLOC_REALISATION)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Intervention démarrée.')
  demarrer(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.interventionsService.demarrer(id, currentUser.sub);
  }

  @Patch(':id/checklist')
  @RequirePermissions(Permission.BLOC_REALISATION)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Étape de la check-list OMS validée.')
  validerChecklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ValiderChecklistDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.interventionsService.validerChecklist(id, dto, currentUser.sub);
  }

  @Post(':id/anesthesie')
  @RequirePermissions(Permission.BLOC_REALISATION)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Anesthésie enregistrée.')
  creerOuCompleterAnesthesie(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAnesthesieDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.interventionsService.creerOuCompleterAnesthesie(id, dto, currentUser.sub);
  }

  @Post(':id/anesthesie/surveillances')
  @RequirePermissions(Permission.BLOC_REALISATION)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Relevé de surveillance anesthésique enregistré.')
  ajouterSurveillanceAnesthesie(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSurveillanceAnesthesieDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.interventionsService.ajouterSurveillanceAnesthesie(id, dto, currentUser.sub);
  }

  @Post(':id/consommables')
  @RequirePermissions(Permission.BLOC_REALISATION)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Consommable enregistré.')
  enregistrerConsommable(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateConsommableInterventionDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.interventionsService.enregistrerConsommable(id, dto, currentUser.sub);
  }

  @Patch(':id/terminer')
  @RequirePermissions(Permission.BLOC_REALISATION)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Intervention terminée.')
  terminer(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.interventionsService.terminer(id, currentUser.sub);
  }

  @Post(':id/compte-rendu')
  @RequirePermissions(Permission.BLOC_COMPTE_RENDU)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Compte rendu opératoire rédigé.')
  redigerCompteRendu(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCompteRenduOperatoireDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.interventionsService.redigerCompteRendu(id, dto, currentUser.sub);
  }
}
