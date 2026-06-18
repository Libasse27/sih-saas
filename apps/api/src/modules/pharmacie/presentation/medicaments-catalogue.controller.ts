import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicalModule, Permission, Scope } from '@sih-saas/shared';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { MedicamentsCatalogueService } from '../application/medicaments-catalogue.service';
import { CreateMedicamentCatalogueDto } from './dto/create-medicament-catalogue.dto';

/** Référentiel partagé entre tous les établissements (pas de RLS) — voir MedicamentsCatalogueService. */
@ApiTags('Pharmacie — Catalogue médicaments')
@ApiBearerAuth()
@Controller('medicaments-catalogue')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ClinicalModule.PHARMACIE)
export class MedicamentsCatalogueController {
  constructor(private readonly catalogueService: MedicamentsCatalogueService) {}

  @Post()
  @RequirePermissions(Permission.STOCK_MANAGE)
  @ResponseMessage('Médicament ajouté au catalogue.')
  create(@Body() dto: CreateMedicamentCatalogueDto) {
    return this.catalogueService.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.STOCK_VIEW)
  @ResponseMessage('Catalogue des médicaments.')
  findAll(@Query() query: PaginationQueryDto) {
    return this.catalogueService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @RequirePermissions(Permission.STOCK_VIEW)
  @ResponseMessage('Médicament récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogueService.findById(id);
  }
}
