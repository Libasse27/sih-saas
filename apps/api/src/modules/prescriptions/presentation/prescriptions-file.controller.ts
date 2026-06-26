import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, Permission, PrescriptionStatut, Scope } from '@sih-saas/shared';
import { IsEnum, IsOptional } from 'class-validator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { PrescriptionsService } from '../application/prescriptions.service';

class FindPrescriptionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PrescriptionStatut)
  statut?: PrescriptionStatut;
}

/**
 * File de travail du pharmacien, transversale à tout l'établissement (Phase 18 — comblait un trou
 * laissé en Phase 13 : un pharmacien devait jusqu'ici ouvrir chaque fiche patient une par une pour
 * trouver les prescriptions VALIDEEs). Routes plates, jamais nichées sous /patients/:patientId — pas
 * de CareContextGuard, même convention que LaboratoireFileController/DispensationsController : la
 * prescription VALIDEE est déjà la chaîne d'autorisation, pas un lien de soin du pharmacien lui-même.
 * Le détail + la dispensation elle-même restent sur PrescriptionsController/DispensationsController
 * (existants, Phase 7/13) — ce contrôleur n'est qu'un point de découverte en lecture.
 */
@ApiTags('Prescriptions — File de travail')
@ApiBearerAuth()
@Controller('prescriptions')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.CONSULTATIONS_MEDICALES)
@RequirePermissions(Permission.DISPENSATION_CREATE)
export class PrescriptionsFileController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  @ResponseMessage('File de travail des prescriptions.')
  findAll(@Query() query: FindPrescriptionsQueryDto) {
    return this.prescriptionsService.findAll(query.page, query.limit, { statut: query.statut });
  }

  @Get(':id')
  @ResponseMessage('Prescription récupérée.')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const prescription = await this.prescriptionsService.findById(id);
    const lignes = await this.prescriptionsService.findLignes(id);
    return { ...prescription, lignes };
  }
}
