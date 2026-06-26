import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdmissionStatut, ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { AdmissionsService } from '../application/admissions.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { TransfertAdmissionDto } from './dto/transfert-admission.dto';

class FindAdmissionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsEnum(AdmissionStatut)
  statut?: AdmissionStatut;
}

@ApiTags('Admissions')
@ApiBearerAuth()
@Controller('admissions')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.HOSPITALISATION)
@RequirePermissions(Permission.ADMISSION_CREATE)
export class AdmissionsController {
  constructor(private readonly admissionsService: AdmissionsService) {}

  @Post()
  @ResponseMessage('Admission créée.')
  create(@Body() dto: CreateAdmissionDto, @CurrentUser() currentUser: JwtPayload) {
    return this.admissionsService.create(dto, currentUser.sub);
  }

  @Get()
  @ResponseMessage('Liste des admissions.')
  findAll(@Query() query: FindAdmissionsQueryDto) {
    return this.admissionsService.findAll(query.page, query.limit, {
      patientId: query.patientId,
      statut: query.statut,
    });
  }

  @Get(':id')
  @ResponseMessage('Admission récupérée.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.admissionsService.findById(id);
  }

  @Post(':id/transfert')
  @RequirePermissions(Permission.LIT_ASSIGN)
  @ResponseMessage('Patient transféré.')
  transfert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransfertAdmissionDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.admissionsService.transfert(id, dto, currentUser.sub);
  }

  @Patch(':id/sortie')
  @ResponseMessage('Sortie enregistrée, lit libéré.')
  sortie(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.admissionsService.sortie(id, currentUser.sub);
  }
}
