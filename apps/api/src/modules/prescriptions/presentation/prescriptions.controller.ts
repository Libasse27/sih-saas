import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { PrescriptionsService } from '../application/prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';

/** Nichée sous /patients/:patientId — CareContextGuard résout le patient via le paramètre de route (cf. ConsultationsController, Phase 6). */
@ApiTags('Prescriptions')
@ApiBearerAuth()
@Controller('patients/:patientId/prescriptions')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ClinicalModule.DME)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @RequirePermissions(Permission.PRESCRIPTION_CREATE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Prescription créée.')
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.prescriptionsService.create(patientId, dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.PRESCRIPTION_CREATE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Prescriptions du patient.')
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string, @Query() query: PaginationQueryDto) {
    return this.prescriptionsService.findByPatient(patientId, query.page, query.limit);
  }

  @Get(':id')
  @RequirePermissions(Permission.PRESCRIPTION_CREATE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Prescription récupérée.')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const prescription = await this.prescriptionsService.findById(id);
    const lignes = await this.prescriptionsService.findLignes(id);
    return { ...prescription, lignes };
  }

  @Patch(':id/valider')
  @RequirePermissions(Permission.PRESCRIPTION_VALIDATE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Prescription validée.')
  valider(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.prescriptionsService.valider(id, currentUser.sub);
  }

  @Patch(':id/annuler')
  @RequirePermissions(Permission.PRESCRIPTION_VALIDATE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Prescription annulée.')
  annuler(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.prescriptionsService.annuler(id, currentUser.sub);
  }
}
