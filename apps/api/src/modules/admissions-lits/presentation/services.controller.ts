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
import { ServicesService } from '../application/services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@ApiTags('Services (admissions/lits)')
@ApiBearerAuth()
@Controller('services')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ClinicalModule.ADMISSIONS)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
  @ResponseMessage('Service créé.')
  create(@Body() dto: CreateServiceDto, @CurrentUser() currentUser: JwtPayload) {
    return this.servicesService.create(dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.LIT_VIEW)
  @ResponseMessage('Liste des services.')
  findAll(@Query() query: PaginationQueryDto) {
    return this.servicesService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @RequirePermissions(Permission.LIT_VIEW)
  @ResponseMessage('Service récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
  @ResponseMessage('Service mis à jour.')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServiceDto, @CurrentUser() currentUser: JwtPayload) {
    return this.servicesService.update(id, dto, currentUser.sub);
  }
}
