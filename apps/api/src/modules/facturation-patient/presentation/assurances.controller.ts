import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { AssurancesService } from '../application/assurances.service';
import { CreateAssuranceDto } from './dto/create-assurance.dto';

/**
 * Nichée sous /patients/:patientId par cohérence REST — PAS de CareContextGuard ici :
 * `assurance:manage` n'est pas marquée 🩺 dans la matrice RBAC (rôle administratif, voir plan Phase 8).
 */
@ApiTags('Facturation patient — Assurances')
@ApiBearerAuth()
@Controller('patients/:patientId/assurances')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.COMPTABILITE_FACTURATION)
@RequirePermissions(Permission.ASSURANCE_MANAGE)
export class AssurancesController {
  constructor(private readonly assurancesService: AssurancesService) {}

  @Post()
  @ResponseMessage('Assurance enregistrée.')
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateAssuranceDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.assurancesService.create(patientId, dto, currentUser.sub);
  }

  @Get()
  @ResponseMessage('Assurances du patient.')
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.assurancesService.findByPatient(patientId);
  }
}
