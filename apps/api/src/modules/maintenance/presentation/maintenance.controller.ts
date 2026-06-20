import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { MaintenanceService } from '../application/maintenance.service';
import { CreateDemandeMaintenanceDto } from './dto/create-demande-maintenance.dto';
import { UpdateDemandeMaintenanceDto } from './dto/update-demande-maintenance.dto';

/** Pas de RequirePlanFeature : module support, non listé dans ClinicalModule (prompt maître §8), toujours disponible. */
@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('demandes-maintenance')
@Scopes(Scope.ETABLISSEMENT)
@RequirePermissions(Permission.MAINTENANCE_MANAGE)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @ResponseMessage('Demande de maintenance signalée.')
  create(@Body() dto: CreateDemandeMaintenanceDto, @CurrentUser() currentUser: JwtPayload) {
    return this.maintenanceService.create(dto, currentUser.sub);
  }

  @Get()
  @ResponseMessage('Liste des demandes de maintenance.')
  findAll(@Query() query: PaginationQueryDto) {
    return this.maintenanceService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @ResponseMessage('Demande de maintenance récupérée.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenanceService.findById(id);
  }

  @Patch(':id')
  @ResponseMessage('Demande de maintenance mise à jour.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDemandeMaintenanceDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.maintenanceService.update(id, dto, currentUser.sub);
  }
}
