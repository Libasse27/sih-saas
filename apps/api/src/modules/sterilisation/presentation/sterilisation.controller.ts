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
import { SterilisationService } from '../application/sterilisation.service';
import { CreateCycleSterilisationDto } from './dto/create-cycle-sterilisation.dto';
import { UpdateCycleSterilisationDto } from './dto/update-cycle-sterilisation.dto';

@ApiTags('Stérilisation')
@ApiBearerAuth()
@Controller('cycles-sterilisation')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.LOGISTIQUE_STOCK)
@RequirePermissions(Permission.STERILISATION_MANAGE)
export class SterilisationController {
  constructor(private readonly sterilisationService: SterilisationService) {}

  @Post()
  @ResponseMessage('Cycle de stérilisation démarré.')
  create(@Body() dto: CreateCycleSterilisationDto, @CurrentUser() currentUser: JwtPayload) {
    return this.sterilisationService.create(dto, currentUser.sub);
  }

  @Get()
  @ResponseMessage('Liste des cycles de stérilisation.')
  findAll(@Query() query: PaginationQueryDto) {
    return this.sterilisationService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @ResponseMessage('Cycle de stérilisation récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sterilisationService.findById(id);
  }

  @Patch(':id')
  @ResponseMessage('Cycle de stérilisation mis à jour.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCycleSterilisationDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.sterilisationService.update(id, dto, currentUser.sub);
  }
}
