import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { FormationsService } from '../application/formations.service';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';

/** Module RH — voir employes.controller.ts. Aucun CareContextGuard (pas de lien patient). */
@ApiTags('RH')
@ApiBearerAuth()
@Controller('employes/:employeId/formations')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.RH)
export class FormationsController {
  constructor(private readonly formationsService: FormationsService) {}

  @Post()
  @RequirePermissions(Permission.RH_MANAGE)
  @ResponseMessage('Formation enregistrée.')
  create(
    @Param('employeId', ParseUUIDPipe) employeId: string,
    @Body() dto: CreateFormationDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.formationsService.create(employeId, dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.RH_VIEW)
  @ResponseMessage('Formations de l’employé.')
  findAll(@Param('employeId', ParseUUIDPipe) employeId: string) {
    return this.formationsService.findAllForEmploye(employeId);
  }

  @Get(':id')
  @RequirePermissions(Permission.RH_VIEW)
  @ResponseMessage('Formation récupérée.')
  findOne(@Param('employeId', ParseUUIDPipe) employeId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.formationsService.findOne(employeId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.RH_MANAGE)
  @ResponseMessage('Formation mise à jour.')
  update(
    @Param('employeId', ParseUUIDPipe) employeId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormationDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.formationsService.update(employeId, id, dto, currentUser.sub);
  }

  @Delete(':id')
  @RequirePermissions(Permission.RH_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Formation supprimée.')
  remove(
    @Param('employeId', ParseUUIDPipe) employeId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.formationsService.remove(employeId, id, currentUser.sub);
  }
}
