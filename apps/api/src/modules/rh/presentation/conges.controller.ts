import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { CongesService } from '../application/conges.service';
import { CreateCongeDto } from './dto/create-conge.dto';

/**
 * Module RH — voir employes.controller.ts. C'est RH qui saisit la demande de congé (pas de
 * self-service employé, aucun rôle "employé" générique dans ce système) : tout sous `rh:manage`,
 * y compris la lecture (pas de split RH_VIEW/RH_MANAGE ici, contrairement aux autres contrôleurs RH).
 */
@ApiTags('RH')
@ApiBearerAuth()
@Controller()
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.RH)
@RequirePermissions(Permission.RH_MANAGE)
export class CongesController {
  constructor(private readonly congesService: CongesService) {}

  @Post('employes/:employeId/conges')
  @ResponseMessage('Demande de congé enregistrée.')
  create(
    @Param('employeId', ParseUUIDPipe) employeId: string,
    @Body() dto: CreateCongeDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.congesService.create(employeId, dto, currentUser.sub);
  }

  @Get('employes/:employeId/conges')
  @ResponseMessage('Demandes de congé de l’employé.')
  findAll(@Param('employeId', ParseUUIDPipe) employeId: string) {
    return this.congesService.findAllForEmploye(employeId);
  }

  @Patch('conges/:id/valider')
  @ResponseMessage('Demande de congé approuvée.')
  valider(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.congesService.valider(id, currentUser.sub);
  }

  @Patch('conges/:id/rejeter')
  @ResponseMessage('Demande de congé rejetée.')
  rejeter(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.congesService.rejeter(id, currentUser.sub);
  }
}
