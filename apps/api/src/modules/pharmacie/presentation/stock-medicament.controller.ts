import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { StockMedicamentService } from '../application/stock-medicament.service';
import { CreateStockMedicamentDto } from './dto/create-stock-medicament.dto';

class FindStockQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  medicamentId?: string;
}

@ApiTags('Pharmacie — Stock')
@ApiBearerAuth()
@Controller('stock-medicament')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.PHARMACIE)
export class StockMedicamentController {
  constructor(private readonly stockService: StockMedicamentService) {}

  @Post()
  @RequirePermissions(Permission.STOCK_MANAGE)
  @ResponseMessage('Lot de stock enregistré.')
  create(@Body() dto: CreateStockMedicamentDto, @CurrentUser() currentUser: JwtPayload) {
    return this.stockService.create(dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.STOCK_VIEW)
  @ResponseMessage('Stock de médicaments.')
  findAll(@Query() query: FindStockQueryDto) {
    return this.stockService.findAll(query.page, query.limit, query.medicamentId);
  }

  @Get(':id')
  @RequirePermissions(Permission.STOCK_VIEW)
  @ResponseMessage('Lot de stock récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.stockService.findById(id);
  }
}
