import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, FacturePatientStatut, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { IsEnum, IsOptional } from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { FacturesPatientService } from '../application/factures-patient.service';

class FindFacturesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FacturePatientStatut)
  statut?: FacturePatientStatut;
}

/** Vue caisse globale (toutes les factures de l'établissement) — pas de CareContextGuard (cf. plan Phase 8). */
@ApiTags('Facturation patient — Caisse')
@ApiBearerAuth()
@Controller('factures-patient')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.COMPTABILITE_FACTURATION)
export class FacturationCaisseController {
  constructor(private readonly facturesPatientService: FacturesPatientService) {}

  @Get()
  @RequirePermissions(Permission.FACTURE_PATIENT_CREATE)
  @ResponseMessage('Factures de l’établissement.')
  findAll(@Query() query: FindFacturesQueryDto) {
    return this.facturesPatientService.findAll(query.page, query.limit, { statut: query.statut });
  }

  @Get(':id')
  @RequirePermissions(Permission.FACTURE_PATIENT_CREATE)
  @ResponseMessage('Facture récupérée.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturesPatientService.findById(id);
  }

  @Patch(':id/annuler')
  @RequirePermissions(Permission.FACTURE_PATIENT_VALIDATE)
  @ResponseMessage('Facture annulée.')
  annuler(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.facturesPatientService.annuler(id, currentUser.sub);
  }
}
