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
import { DemandesImagerieService } from '../application/demandes-imagerie.service';
import { CreateDemandeImagerieDto } from './dto/create-demande-imagerie.dto';

/** Nichée sous /patients/:patientId — CareContextGuard résout le patient via le paramètre de route. */
@ApiTags('Imagerie — Demandes')
@ApiBearerAuth()
@Controller('patients/:patientId/demandes-imagerie')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard, CareContextGuard)
@RequirePlanFeature(ClinicalModule.IMAGERIE)
@RequirePermissions(Permission.IMAGERIE_REQUEST)
export class DemandesImagerieController {
  constructor(private readonly demandesImagerieService: DemandesImagerieService) {}

  @Post()
  @ResponseMessage('Demande d’imagerie créée.')
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateDemandeImagerieDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.demandesImagerieService.create(patientId, dto, currentUser.sub);
  }

  @Get()
  @ResponseMessage('Demandes d’imagerie du patient.')
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string, @Query() query: PaginationQueryDto) {
    return this.demandesImagerieService.findAll(query.page, query.limit, { patientId });
  }
}
