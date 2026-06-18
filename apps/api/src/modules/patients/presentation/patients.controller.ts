import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PatientsService } from '../application/patients.service';
import { CreatePatientAccesDto } from './dto/create-patient-acces.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.PATIENT_CREATE)
  @ResponseMessage('Patient créé avec succès.')
  create(@Body() dto: CreatePatientDto, @CurrentUser() currentUser: JwtPayload) {
    return this.patientsService.create(dto, currentUser.sub);
  }

  @Get()
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.PATIENT_READ)
  @ResponseMessage('Liste des patients de l’établissement.')
  findAll(@Query() query: PaginationQueryDto) {
    return this.patientsService.findAll(query.page, query.limit);
  }

  @Get('me')
  @Scopes(Scope.PATIENT)
  @ResponseMessage('Mes informations.')
  async findMine(@CurrentUser() currentUser: JwtPayload) {
    const patient = await this.patientsService.findByUserId(currentUser.sub);
    if (!patient) {
      throw new NotFoundException('Aucun dossier patient associé à ce compte.');
    }
    return patient;
  }

  @Get(':id')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.PATIENT_READ)
  @ResponseMessage('Patient récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.findById(id);
  }

  @Patch(':id')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.PATIENT_CREATE)
  @ResponseMessage('Patient mis à jour.')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePatientDto, @CurrentUser() currentUser: JwtPayload) {
    return this.patientsService.update(id, dto, currentUser.sub);
  }

  @Post(':id/compte-acces')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.PATIENT_CREATE)
  @ResponseMessage('Compte d’accès patient créé.')
  creerCompteAcces(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePatientAccesDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.patientsService.creerCompteAcces(id, dto, currentUser.sub);
  }
}
