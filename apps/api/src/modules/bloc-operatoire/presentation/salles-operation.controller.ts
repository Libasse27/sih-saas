import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { SallesOperationService } from '../application/salles-operation.service';
import { CreateSalleOperationDto } from './dto/create-salle-operation.dto';
import { UpdateSalleOperationDto } from './dto/update-salle-operation.dto';

/** CRUD de l'infrastructure physique du bloc — ETABLISSEMENT_SETTINGS, même convention que Chambre/Lit. */
@ApiTags('Bloc Opératoire')
@ApiBearerAuth()
@Controller('salles-operation')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.BLOC_OPERATOIRE)
export class SallesOperationController {
  constructor(private readonly sallesOperationService: SallesOperationService) {}

  @Post()
  @RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
  @ResponseMessage("Salle d'opération créée.")
  create(@Body() dto: CreateSalleOperationDto, @CurrentUser() currentUser: JwtPayload) {
    return this.sallesOperationService.create(dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.BLOC_VIEW)
  @ResponseMessage("Liste des salles d'opération.")
  findAll(@Query() query: PaginationQueryDto) {
    return this.sallesOperationService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @RequirePermissions(Permission.BLOC_VIEW)
  @ResponseMessage("Salle d'opération récupérée.")
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sallesOperationService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
  @ResponseMessage("Salle d'opération mise à jour.")
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSalleOperationDto, @CurrentUser() currentUser: JwtPayload) {
    return this.sallesOperationService.update(id, dto, currentUser.sub);
  }
}
