import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, DemandeStatut, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { IsEnum, IsOptional } from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { ComptesRendusImagerieService } from '../application/comptes-rendus-imagerie.service';
import { DemandesImagerieService } from '../application/demandes-imagerie.service';
import { CreateCompteRenduImagerieDto } from './dto/create-compte-rendu-imagerie.dto';
import { ValiderCompteRenduImagerieDto } from './dto/valider-compte-rendu-imagerie.dto';

class FindDemandesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(DemandeStatut)
  statut?: DemandeStatut;
}

/** File de travail de l'imagerie — routes plates, pas de CareContextGuard (cf. plan Phase 7). */
@ApiTags('Imagerie — File de travail')
@ApiBearerAuth()
@Controller('demandes-imagerie')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.IMAGERIE_MEDICALE)
export class ImagerieFileController {
  constructor(
    private readonly demandesImagerieService: DemandesImagerieService,
    private readonly comptesRendusImagerieService: ComptesRendusImagerieService,
  ) {}

  @Get()
  @RequirePermissions(Permission.IMAGERIE_REPORT_WRITE)
  @ResponseMessage('File de travail de l’imagerie.')
  findAll(@Query() query: FindDemandesQueryDto) {
    return this.demandesImagerieService.findAll(query.page, query.limit, { statut: query.statut });
  }

  @Get(':id')
  @RequirePermissions(Permission.IMAGERIE_REPORT_WRITE)
  @ResponseMessage('Demande d’imagerie récupérée.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.demandesImagerieService.findById(id);
  }

  @Post(':id/compte-rendu')
  @RequirePermissions(Permission.IMAGERIE_REPORT_WRITE)
  @ResponseMessage('Compte rendu enregistré, demande passée EN_COURS.')
  ecrireCompteRendu(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCompteRenduImagerieDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.comptesRendusImagerieService.ecrire(id, dto, currentUser.sub);
  }

  @Get(':id/compte-rendu')
  @RequirePermissions(Permission.IMAGERIE_REPORT_WRITE)
  @ResponseMessage('Compte rendu récupéré.')
  findCompteRendu(@Param('id', ParseUUIDPipe) id: string) {
    return this.comptesRendusImagerieService.findByDemande(id);
  }

  @Patch(':id/compte-rendu/valider')
  @RequirePermissions(Permission.IMAGERIE_REPORT_VALIDATE)
  @ResponseMessage('Compte rendu validé, ajouté au dossier médical, prescripteur notifié.')
  validerCompteRendu(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ValiderCompteRenduImagerieDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.comptesRendusImagerieService.valider(id, dto, currentUser.sub);
  }
}
