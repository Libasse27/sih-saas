import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicalModule, DemandeStatut, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { IsEnum, IsOptional } from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { DemandesAnalyseService } from '../application/demandes-analyse.service';
import { ResultatsAnalyseService } from '../application/resultats-analyse.service';
import { CreateResultatAnalyseDto } from './dto/create-resultat-analyse.dto';

class FindDemandesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(DemandeStatut)
  statut?: DemandeStatut;
}

/**
 * File de travail du laboratoire — routes plates (pas de CareContextGuard, voir plan Phase 7 :
 * la demande déjà autorisée par le prescripteur est la chaîne de traçabilité, pas un lien de soin
 * généraliste du laborantin/biologiste avec le patient).
 */
@ApiTags('Laboratoire — File de travail')
@ApiBearerAuth()
@Controller('demandes-analyse')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ClinicalModule.LABORATOIRE)
export class LaboratoireFileController {
  constructor(
    private readonly demandesAnalyseService: DemandesAnalyseService,
    private readonly resultatsAnalyseService: ResultatsAnalyseService,
  ) {}

  @Get()
  @RequirePermissions(Permission.LABO_RESULT_WRITE)
  @ResponseMessage('File de travail du laboratoire.')
  findAll(@Query() query: FindDemandesQueryDto) {
    return this.demandesAnalyseService.findAll(query.page, query.limit, { statut: query.statut });
  }

  @Get(':id')
  @RequirePermissions(Permission.LABO_RESULT_WRITE)
  @ResponseMessage('Demande d’analyse récupérée.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.demandesAnalyseService.findById(id);
  }

  @Post(':id/resultat')
  @RequirePermissions(Permission.LABO_RESULT_WRITE)
  @ResponseMessage('Résultat enregistré, demande passée EN_COURS.')
  ecrireResultat(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateResultatAnalyseDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.resultatsAnalyseService.ecrire(id, dto, currentUser.sub);
  }

  @Get(':id/resultat')
  @RequirePermissions(Permission.LABO_RESULT_WRITE)
  @ResponseMessage('Résultat récupéré.')
  findResultat(@Param('id', ParseUUIDPipe) id: string) {
    return this.resultatsAnalyseService.findByDemande(id);
  }

  @Patch(':id/resultat/valider')
  @RequirePermissions(Permission.LABO_RESULT_VALIDATE)
  @ResponseMessage('Résultat validé, ajouté au dossier médical, prescripteur notifié.')
  validerResultat(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.resultatsAnalyseService.valider(id, currentUser.sub);
  }
}
