import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicalModule, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CareContextGuard } from '../../../shared/guards/care-context.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { AdministrationService } from '../application/administration.service';
import { CreateAdministrationDto } from './dto/create-administration.dto';

/** Nichée sous /patients/:patientId — CareContextGuard résout le patient via le paramètre de route. */
@ApiTags('Pharmacie — Administration')
@ApiBearerAuth()
@Controller('patients/:patientId/administrations')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard, CareContextGuard)
@RequirePlanFeature(ClinicalModule.PHARMACIE)
@RequirePermissions(Permission.ADMINISTRATION_CREATE)
export class AdministrationController {
  constructor(private readonly administrationService: AdministrationService) {}

  @Post()
  @ResponseMessage('Administration de médicament enregistrée.')
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateAdministrationDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.administrationService.create(patientId, dto, currentUser.sub);
  }

  @Get()
  @ResponseMessage('Historique des administrations du patient.')
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string, @Query() query: PaginationQueryDto) {
    return this.administrationService.findByPatient(patientId, query.page, query.limit);
  }
}
