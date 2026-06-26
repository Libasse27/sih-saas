import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { PresencesService } from '../application/presences.service';
import { CreatePresenceDto } from './dto/create-presence.dto';
import { FindPresencesQueryDto } from './dto/find-presences-query.dto';

/** Module RH — voir employes.controller.ts. Aucun CareContextGuard (pas de lien patient). */
@ApiTags('RH')
@ApiBearerAuth()
@Controller('employes/:employeId/presences')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.RH)
export class PresencesController {
  constructor(private readonly presencesService: PresencesService) {}

  @Post()
  @RequirePermissions(Permission.RH_MANAGE)
  @ResponseMessage('Pointage enregistré.')
  create(
    @Param('employeId', ParseUUIDPipe) employeId: string,
    @Body() dto: CreatePresenceDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.presencesService.create(employeId, dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.RH_VIEW)
  @ResponseMessage('Pointages de l’employé.')
  findAll(@Param('employeId', ParseUUIDPipe) employeId: string, @Query() query: FindPresencesQueryDto) {
    return this.presencesService.findAllForEmploye(employeId, query);
  }
}
