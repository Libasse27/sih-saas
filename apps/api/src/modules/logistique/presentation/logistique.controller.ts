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
import { LogistiqueService } from '../application/logistique.service';
import { CreateArticleStockDto } from './dto/create-article-stock.dto';
import { UpdateArticleStockDto } from './dto/update-article-stock.dto';

@ApiTags('Logistique')
@ApiBearerAuth()
@Controller('articles-stock')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.LOGISTIQUE_STOCK)
export class LogistiqueController {
  constructor(private readonly logistiqueService: LogistiqueService) {}

  @Post()
  @RequirePermissions(Permission.STOCK_MANAGE)
  @ResponseMessage('Article de stock créé.')
  create(@Body() dto: CreateArticleStockDto, @CurrentUser() currentUser: JwtPayload) {
    return this.logistiqueService.create(dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.STOCK_VIEW)
  @ResponseMessage('Liste des articles de stock.')
  findAll(@Query() query: PaginationQueryDto) {
    return this.logistiqueService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @RequirePermissions(Permission.STOCK_VIEW)
  @ResponseMessage('Article de stock récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.logistiqueService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.STOCK_MANAGE)
  @ResponseMessage('Article de stock mis à jour.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleStockDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.logistiqueService.update(id, dto, currentUser.sub);
  }
}
