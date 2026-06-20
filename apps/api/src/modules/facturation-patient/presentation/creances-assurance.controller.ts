import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicalModule, JwtPayload, Permission, Scope, StatutCreanceAssurance } from '@sih-saas/shared';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { CreancesAssuranceService } from '../application/creances-assurance.service';
import { MarquerCreancePayeeDto } from './dto/marquer-creance-payee.dto';
import { MarquerCreanceRejeteeDto } from './dto/marquer-creance-rejetee.dto';

class FindCreancesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(StatutCreanceAssurance)
  statut?: StatutCreanceAssurance;

  @IsOptional()
  @IsUUID()
  assuranceId?: string;
}

/**
 * File de travail caisse-wide (toutes les créances de l'établissement) — pas de CareContextGuard,
 * `assurance:manage` n'est pas marquée 🩺 (même décision que AssurancesController, plan Phase 8).
 */
@ApiTags('Facturation patient — Créances assurance (tiers-payant)')
@ApiBearerAuth()
@Controller('creances-assurance')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ClinicalModule.FACTURATION)
@RequirePermissions(Permission.ASSURANCE_MANAGE)
export class CreancesAssuranceController {
  constructor(private readonly creancesAssuranceService: CreancesAssuranceService) {}

  @Get()
  @ResponseMessage('Créances assurance.')
  findAll(@Query() query: FindCreancesQueryDto) {
    return this.creancesAssuranceService.findAll(query.page, query.limit, {
      statut: query.statut,
      assuranceId: query.assuranceId,
    });
  }

  @Get(':id')
  @ResponseMessage('Créance assurance récupérée.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.creancesAssuranceService.findById(id);
  }

  @Patch(':id/soumettre')
  @ResponseMessage('Créance soumise à l’assureur.')
  soumettre(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.creancesAssuranceService.soumettre(id, currentUser.sub);
  }

  @Patch(':id/marquer-payee')
  @ResponseMessage('Créance marquée payée.')
  marquerPayee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarquerCreancePayeeDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.creancesAssuranceService.marquerPayee(id, dto.referenceReglement, currentUser.sub);
  }

  @Patch(':id/marquer-rejetee')
  @ResponseMessage('Créance marquée rejetée.')
  marquerRejetee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarquerCreanceRejeteeDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.creancesAssuranceService.marquerRejetee(id, dto.motifRejet, currentUser.sub);
  }
}
