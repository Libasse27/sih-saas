import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { EmployesService } from '../application/employes.service';
import { CreateEmployeDto } from './dto/create-employe.dto';
import { UpdateEmployeDto } from './dto/update-employe.dto';

/**
 * Module RH (prompt maître §10.4) — aucun accès clinique, aucun CareContextGuard (pas de lien
 * patient). `rh:view` sur les lectures, `rh:manage` sur les écritures (matrice-rbac.md).
 */
@ApiTags('RH')
@ApiBearerAuth()
@Controller('employes')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.RH)
export class EmployesController {
  constructor(private readonly employesService: EmployesService) {}

  @Post()
  @RequirePermissions(Permission.RH_MANAGE)
  @ResponseMessage('Employé enregistré.')
  create(@Body() dto: CreateEmployeDto, @CurrentUser() currentUser: JwtPayload) {
    return this.employesService.create(dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.RH_VIEW)
  @ResponseMessage('Liste des employés.')
  findAll(@Query() query: PaginationQueryDto) {
    return this.employesService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @RequirePermissions(Permission.RH_VIEW)
  @ResponseMessage('Employé récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.employesService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.RH_MANAGE)
  @ResponseMessage('Employé mis à jour.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.employesService.update(id, dto, currentUser.sub);
  }

  @Delete(':id')
  @RequirePermissions(Permission.RH_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Employé supprimé.')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.employesService.remove(id, currentUser.sub);
  }
}
