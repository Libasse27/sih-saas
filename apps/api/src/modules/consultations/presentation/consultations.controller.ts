import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CareContextGuard } from '../../../shared/guards/care-context.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { ConsultationsService } from '../application/consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';

/**
 * Nichée sous /patients/:patientId/consultations (et non /consultations avec patientId en body) :
 * CareContextGuard résout le patient via le paramètre de route :patientId, exactement comme
 * DossierMedicalController — voir docs/phase-0/strategie-isolation.md §5.
 */
@ApiTags('Consultations')
@ApiBearerAuth()
@Controller('patients/:patientId/consultations')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.CONSULTATIONS_MEDICALES)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  @RequirePermissions(Permission.CONSULTATION_CREATE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Consultation enregistrée.')
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateConsultationDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.consultationsService.create(patientId, dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.DOSSIER_READ)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Historique des consultations du patient.')
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string, @Query() query: PaginationQueryDto) {
    return this.consultationsService.findAll(query.page, query.limit, patientId);
  }

  @Get(':id')
  @RequirePermissions(Permission.DOSSIER_READ)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Consultation récupérée.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.consultationsService.findById(id);
  }
}
