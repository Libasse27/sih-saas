import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicalModule, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { SitesService } from '../application/sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@ApiTags('Sites (admissions/lits)')
@ApiBearerAuth()
@Controller('sites')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ClinicalModule.ADMISSIONS)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
  @ResponseMessage('Site créé.')
  create(@Body() dto: CreateSiteDto, @CurrentUser() currentUser: JwtPayload) {
    return this.sitesService.create(dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.LIT_VIEW)
  @ResponseMessage('Liste des sites.')
  findAll(@Query() query: PaginationQueryDto) {
    return this.sitesService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @RequirePermissions(Permission.LIT_VIEW)
  @ResponseMessage('Site récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sitesService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
  @ResponseMessage('Site mis à jour.')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSiteDto, @CurrentUser() currentUser: JwtPayload) {
    return this.sitesService.update(id, dto, currentUser.sub);
  }
}
