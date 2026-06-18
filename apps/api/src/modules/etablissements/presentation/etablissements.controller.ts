import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { EtablissementsService } from '../application/etablissements.service';
import { CreateEtablissementDto } from './dto/create-etablissement.dto';
import { UpdateEtablissementStatutDto } from './dto/update-etablissement-statut.dto';

@ApiTags('Établissements (plateforme)')
@ApiBearerAuth()
@Controller('etablissements')
@Scopes(Scope.PLATFORM)
export class EtablissementsController {
  constructor(private readonly etablissementsService: EtablissementsService) {}

  @Post()
  @RequirePermissions(Permission.ETABLISSEMENT_MANAGE)
  @ResponseMessage('Établissement créé avec succès.')
  create(@Body() dto: CreateEtablissementDto, @CurrentUser() currentUser: JwtPayload) {
    return this.etablissementsService.create(dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.ETABLISSEMENT_MANAGE)
  @ResponseMessage('Liste des établissements.')
  findAll(@Query() query: PaginationQueryDto) {
    return this.etablissementsService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @RequirePermissions(Permission.ETABLISSEMENT_MANAGE)
  @ResponseMessage('Établissement récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.etablissementsService.findById(id);
  }

  @Patch(':id/statut')
  @RequirePermissions(Permission.ETABLISSEMENT_SUSPEND)
  @ResponseMessage('Statut de l’établissement mis à jour.')
  updateStatut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEtablissementStatutDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.etablissementsService.updateStatut(id, dto.statut, currentUser.sub);
  }
}
