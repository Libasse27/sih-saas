import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope, InterventionStatut } from '@sih-saas/shared';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { InterventionsService } from '../application/interventions.service';
import { AjouterMembreEquipeDto } from './dto/ajouter-membre-equipe.dto';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';

class FindInterventionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InterventionStatut)
  statut?: InterventionStatut;

  @IsOptional()
  @IsUUID()
  salleOperationId?: string;
}

/**
 * Planning du bloc opératoire (board) — route plate, jamais 🩺 : BLOC_PLANIFICATION n'est pas dans
 * CARE_CONTEXT_PERMISSIONS (acte qui établit le lien, même raisonnement que URGENCE_TRIAGE). Les
 * actions cliniques sur une intervention en cours vivent dans `InterventionsPatientController`,
 * nichée sous /patients/:patientId pour CareContextGuard.
 */
@ApiTags('Bloc Opératoire')
@ApiBearerAuth()
@Controller('interventions')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.BLOC_OPERATOIRE)
export class InterventionsController {
  constructor(private readonly interventionsService: InterventionsService) {}

  @Post()
  @RequirePermissions(Permission.BLOC_PLANIFICATION)
  @ResponseMessage('Intervention planifiée.')
  create(@Body() dto: CreateInterventionDto, @CurrentUser() currentUser: JwtPayload) {
    return this.interventionsService.create(dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.BLOC_VIEW)
  @ResponseMessage('Planning du bloc opératoire.')
  findAll(@Query() query: FindInterventionsQueryDto) {
    return this.interventionsService.findAll(query.page, query.limit, {
      statut: query.statut,
      salleOperationId: query.salleOperationId,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.BLOC_VIEW)
  @ResponseMessage('Intervention récupérée.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.interventionsService.findDetailComplet(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.BLOC_PLANIFICATION)
  @ResponseMessage('Intervention replanifiée.')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInterventionDto, @CurrentUser() currentUser: JwtPayload) {
    return this.interventionsService.update(id, dto, currentUser.sub);
  }

  @Patch(':id/annuler')
  @RequirePermissions(Permission.BLOC_PLANIFICATION)
  @ResponseMessage('Intervention annulée.')
  annuler(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.interventionsService.annuler(id, currentUser.sub);
  }

  @Post(':id/equipe')
  @RequirePermissions(Permission.BLOC_PLANIFICATION)
  @ResponseMessage("Membre ajouté à l'équipe opératoire.")
  ajouterMembreEquipe(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AjouterMembreEquipeDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.interventionsService.ajouterMembreEquipe(id, dto, currentUser.sub);
  }

  @Delete(':id/equipe/:membreId')
  @RequirePermissions(Permission.BLOC_PLANIFICATION)
  @ResponseMessage("Membre retiré de l'équipe opératoire.")
  retirerMembreEquipe(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('membreId', ParseUUIDPipe) membreId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.interventionsService.retirerMembreEquipe(id, membreId, currentUser.sub);
  }
}
