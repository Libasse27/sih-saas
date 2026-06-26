import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope, UrgenceStatut } from '@sih-saas/shared';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { UrgencesService } from '../application/urgences.service';
import { CreateUrgenceDto } from './dto/create-urgence.dto';
import { TriageUrgenceDto } from './dto/triage-urgence.dto';

class FindUrgencesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(UrgenceStatut)
  statut?: UrgenceStatut;

  @IsOptional()
  @IsUUID()
  serviceId?: string;
}

/**
 * File de travail des urgences (board) — route plate, jamais 🩺 : URGENCE_TRIAGE n'est pas dans
 * CARE_CONTEXT_PERMISSIONS (premier contact, même raisonnement que ADMISSION_CREATE). Les actions
 * cliniques sur un épisode existant (prise en charge/surveillance/alerte/clôture) vivent dans
 * `UrgencesPatientController`, nichée sous /patients/:patientId pour CareContextGuard.
 */
@ApiTags('Urgences')
@ApiBearerAuth()
@Controller('urgences')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.URGENCES)
export class UrgencesController {
  constructor(private readonly urgencesService: UrgencesService) {}

  @Post()
  @RequirePermissions(Permission.URGENCE_TRIAGE)
  @ResponseMessage('Épisode aux urgences créé.')
  create(@Body() dto: CreateUrgenceDto, @CurrentUser() currentUser: JwtPayload) {
    return this.urgencesService.create(dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.URGENCE_VIEW)
  @ResponseMessage('File des urgences.')
  findAll(@Query() query: FindUrgencesQueryDto) {
    return this.urgencesService.findAll(query.page, query.limit, {
      statut: query.statut,
      serviceId: query.serviceId,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.URGENCE_VIEW)
  @ResponseMessage('Épisode aux urgences récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.urgencesService.findDetailComplet(id);
  }

  @Patch(':id/triage')
  @RequirePermissions(Permission.URGENCE_TRIAGE)
  @ResponseMessage('Triage mis à jour.')
  trier(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TriageUrgenceDto, @CurrentUser() currentUser: JwtPayload) {
    return this.urgencesService.trier(id, dto, currentUser.sub);
  }
}
