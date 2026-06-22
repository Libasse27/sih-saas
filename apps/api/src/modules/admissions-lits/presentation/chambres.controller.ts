import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicalModule, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { ChambresService } from '../application/chambres.service';
import { CreateChambreDto } from './dto/create-chambre.dto';

class FindChambresQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;
}

@ApiTags('Chambres (admissions/lits)')
@ApiBearerAuth()
@Controller('chambres')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ClinicalModule.ADMISSIONS)
export class ChambresController {
  constructor(private readonly chambresService: ChambresService) {}

  @Post()
  @RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
  @ResponseMessage('Chambre créée.')
  create(@Body() dto: CreateChambreDto, @CurrentUser() currentUser: JwtPayload) {
    return this.chambresService.create(dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.LIT_VIEW)
  @ResponseMessage('Liste des chambres.')
  findAll(@Query() query: FindChambresQueryDto) {
    return this.chambresService.findAll(query.page, query.limit, { serviceId: query.serviceId, siteId: query.siteId });
  }

  @Get(':id')
  @RequirePermissions(Permission.LIT_VIEW)
  @ResponseMessage('Chambre récupérée.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.chambresService.findById(id);
  }
}
