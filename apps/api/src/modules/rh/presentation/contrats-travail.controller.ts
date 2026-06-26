import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { ContratsTravailService } from '../application/contrats-travail.service';
import { CreateContratTravailDto } from './dto/create-contrat-travail.dto';
import { UpdateContratTravailDto } from './dto/update-contrat-travail.dto';

/** Module RH — voir employes.controller.ts. Aucun CareContextGuard (pas de lien patient). */
@ApiTags('RH')
@ApiBearerAuth()
@Controller('employes/:employeId/contrats')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.RH)
export class ContratsTravailController {
  constructor(private readonly contratsTravailService: ContratsTravailService) {}

  @Post()
  @RequirePermissions(Permission.RH_MANAGE)
  @ResponseMessage('Contrat de travail créé.')
  create(
    @Param('employeId', ParseUUIDPipe) employeId: string,
    @Body() dto: CreateContratTravailDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.contratsTravailService.create(employeId, dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.RH_VIEW)
  @ResponseMessage('Contrats de travail de l’employé.')
  findAll(@Param('employeId', ParseUUIDPipe) employeId: string) {
    return this.contratsTravailService.findAllForEmploye(employeId);
  }

  @Get(':id')
  @RequirePermissions(Permission.RH_VIEW)
  @ResponseMessage('Contrat de travail récupéré.')
  findOne(@Param('employeId', ParseUUIDPipe) employeId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.contratsTravailService.findOne(employeId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.RH_MANAGE)
  @ResponseMessage('Contrat de travail mis à jour.')
  update(
    @Param('employeId', ParseUUIDPipe) employeId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContratTravailDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.contratsTravailService.update(employeId, id, dto, currentUser.sub);
  }
}
