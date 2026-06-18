import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicalModule, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { FacturesPatientService } from '../application/factures-patient.service';
import { CreateFacturePatientDto } from './dto/create-facture-patient.dto';

/** Pas de CareContextGuard : `facture-patient:create` n'est pas 🩺 dans la matrice RBAC (voir plan Phase 8). */
@ApiTags('Facturation patient — Factures')
@ApiBearerAuth()
@Controller('patients/:patientId/factures-patient')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ClinicalModule.FACTURATION)
@RequirePermissions(Permission.FACTURE_PATIENT_CREATE)
export class FacturesPatientController {
  constructor(private readonly facturesPatientService: FacturesPatientService) {}

  @Post()
  @ResponseMessage('Facture créée, part assurance/reste à charge calculés.')
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateFacturePatientDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.facturesPatientService.create(patientId, dto, currentUser.sub);
  }

  @Get()
  @ResponseMessage('Factures du patient.')
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string, @Query() query: PaginationQueryDto) {
    return this.facturesPatientService.findByPatient(patientId, query.page, query.limit);
  }
}
