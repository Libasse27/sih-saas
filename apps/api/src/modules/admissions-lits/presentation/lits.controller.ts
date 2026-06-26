import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, LitStatut, Permission, Scope } from '@sih-saas/shared';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { LitsService } from '../application/lits.service';
import { CreateLitDto } from './dto/create-lit.dto';
import { UpdateLitStatutDto } from './dto/update-lit-statut.dto';

class FindLitsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsEnum(LitStatut)
  statut?: LitStatut;
}

@ApiTags('Lits (admissions/lits)')
@ApiBearerAuth()
@Controller('lits')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.HOSPITALISATION)
export class LitsController {
  constructor(private readonly litsService: LitsService) {}

  @Post()
  @RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
  @ResponseMessage('Lit créé.')
  create(@Body() dto: CreateLitDto, @CurrentUser() currentUser: JwtPayload) {
    return this.litsService.create(dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.LIT_VIEW)
  @ResponseMessage('Liste des lits.')
  findAll(@Query() query: FindLitsQueryDto) {
    return this.litsService.findAll(query.page, query.limit, {
      serviceId: query.serviceId,
      siteId: query.siteId,
      statut: query.statut,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.LIT_VIEW)
  @ResponseMessage('Lit récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.litsService.findById(id);
  }

  @Patch(':id/liberer')
  @RequirePermissions(Permission.LIT_LIBERER)
  @ResponseMessage('Lit libéré.')
  liberer(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.litsService.liberer(id, currentUser.sub);
  }

  @Patch(':id/statut')
  @RequirePermissions(Permission.LIT_ASSIGN)
  @ResponseMessage('Statut du lit mis à jour.')
  changerStatut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLitStatutDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.litsService.changerStatutStructurel(id, dto.statut, currentUser.sub);
  }
}
