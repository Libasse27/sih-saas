import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicalModule, JwtPayload, Permission, RendezVousStatut, Scope } from '@sih-saas/shared';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PatientsService } from '../../patients/application/patients.service';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { RendezVousService } from '../application/rendez-vous.service';
import { CreateRendezVousPatientDto } from './dto/create-rendez-vous-patient.dto';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { UpdateRendezVousStatutDto } from './dto/update-rendez-vous-statut.dto';

class FindRendezVousQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  praticienId?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsEnum(RendezVousStatut)
  statut?: RendezVousStatut;
}

@ApiTags('Rendez-vous')
@ApiBearerAuth()
@Controller('rendez-vous')
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ClinicalModule.RDV)
export class RendezVousController {
  constructor(
    private readonly rendezVousService: RendezVousService,
    private readonly patientsService: PatientsService,
  ) {}

  @Post()
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.RDV_CREATE)
  @ResponseMessage('Rendez-vous créé.')
  create(@Body() dto: CreateRendezVousDto, @CurrentUser() currentUser: JwtPayload) {
    return this.rendezVousService.create(dto, currentUser.sub);
  }

  // Déclarées avant ":id" pour que "me" ne soit jamais capturé par le paramètre (cf. dossier-medical.controller.ts).
  @Post('me')
  @Scopes(Scope.PATIENT)
  @ResponseMessage('Rendez-vous demandé.')
  async createMine(@Body() dto: CreateRendezVousPatientDto, @CurrentUser() currentUser: JwtPayload) {
    const patient = await this.patientsService.findByUserId(currentUser.sub);
    if (!patient) {
      throw new NotFoundException('Aucun dossier patient associé à ce compte.');
    }
    return this.rendezVousService.createForPatient(patient.id, dto, currentUser.sub);
  }

  @Get('me')
  @Scopes(Scope.PATIENT)
  @ResponseMessage('Mes rendez-vous.')
  async findMine(@Query() query: PaginationQueryDto, @CurrentUser() currentUser: JwtPayload) {
    const patient = await this.patientsService.findByUserId(currentUser.sub);
    if (!patient) {
      throw new NotFoundException('Aucun dossier patient associé à ce compte.');
    }
    return this.rendezVousService.findByPatient(patient.id, query.page, query.limit);
  }

  @Get()
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.RDV_CREATE)
  @ResponseMessage('Agenda des rendez-vous.')
  findAll(@Query() query: FindRendezVousQueryDto) {
    return this.rendezVousService.findAll(query.page, query.limit, {
      praticienId: query.praticienId,
      patientId: query.patientId,
      statut: query.statut,
    });
  }

  @Get(':id')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.RDV_CREATE)
  @ResponseMessage('Rendez-vous récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rendezVousService.findById(id);
  }

  @Patch(':id/statut')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.RDV_MANAGE)
  @ResponseMessage('Statut du rendez-vous mis à jour.')
  changerStatut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRendezVousStatutDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.rendezVousService.changerStatut(id, dto.statut, currentUser.sub);
  }
}
