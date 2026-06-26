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
import { DemandesAnalyseService } from '../application/demandes-analyse.service';
import { CreateDemandeAnalyseDto } from './dto/create-demande-analyse.dto';

/** Nichée sous /patients/:patientId — CareContextGuard résout le patient via le paramètre de route. */
@ApiTags('Laboratoire — Demandes')
@ApiBearerAuth()
@Controller('patients/:patientId/demandes-analyse')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard, CareContextGuard)
@RequirePlanFeature(ModuleMetier.LABORATOIRE)
@RequirePermissions(Permission.LABO_REQUEST)
export class DemandesAnalyseController {
  constructor(private readonly demandesAnalyseService: DemandesAnalyseService) {}

  @Post()
  @ResponseMessage('Demande d’analyse créée.')
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateDemandeAnalyseDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.demandesAnalyseService.create(patientId, dto, currentUser.sub);
  }

  @Get()
  @ResponseMessage('Demandes d’analyse du patient.')
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string, @Query() query: PaginationQueryDto) {
    return this.demandesAnalyseService.findAll(query.page, query.limit, { patientId });
  }
}
