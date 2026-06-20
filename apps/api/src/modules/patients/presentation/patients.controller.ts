import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PatientsService } from '../application/patients.service';
import { CreatePatientAccesDto } from './dto/create-patient-acces.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { EnregistrerConsentementDto } from './dto/enregistrer-consentement.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

class FindPatientsQueryDto extends PaginationQueryDto {
  /** Filtre sur nom OU prénom — recherche par IDH exact reste GET /patients/recherche/:idh. */
  @IsOptional()
  @IsString()
  recherche?: string;
}

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
  findAll(@Query() query: FindPatientsQueryDto) {
    return this.patientsService.findAll(query.page, query.limit, query.recherche);
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

  /** Déclarée avant `:id/consentements` — même précaution que `me` ci-dessus. */
  @Post('me/consentements')
  @Scopes(Scope.PATIENT)
  @ResponseMessage('Consentement enregistré.')
  async enregistrerMonConsentement(@Body() dto: EnregistrerConsentementDto, @CurrentUser() currentUser: JwtPayload) {
    const patient = await this.patientsService.findByUserId(currentUser.sub);
    if (!patient) {
      throw new NotFoundException('Aucun dossier patient associé à ce compte.');
    }
    return this.patientsService.enregistrerConsentement(patient.id, dto.type, dto.valeur, currentUser.sub);
  }

  /**
   * Déclarée avant `:id` (même précaution que `/praticiens` côté UsersController) — pas de
   * collision possible ici de toute façon (profondeur de chemin différente), mais garde la
   * convention. Pas de `@RequirePermissions` : OR (PATIENT_READ | SOCIAL_MANAGE) impossible à
   * exprimer avec ce décorateur (ET logique, voir permissions.guard.ts) — un assistant social n'a
   * que `social:manage`, jamais `patient:read` (matrice-rbac.md), mais doit pouvoir résoudre l'IDH
   * qu'on lui communique avant de créer une note sociale (Phase 12, écran desktop Social).
   */
  @Get('recherche/:idh')
  @Scopes(Scope.ETABLISSEMENT)
  @ResponseMessage('Patient trouvé.')
  findByIdh(@Param('idh') idh: string, @CurrentUser() currentUser: JwtPayload) {
    if (
      !currentUser.permissions.includes(Permission.PATIENT_READ) &&
      !currentUser.permissions.includes(Permission.SOCIAL_MANAGE)
    ) {
      throw new ForbiddenException('Accès refusé : permission manquante pour cette action.');
    }
    return this.patientsService.findByIdh(idh);
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

  /** Enregistré par le personnel (admission) — pour le patient lui-même, voir POST /patients/me/consentements. */
  @Post(':id/consentements')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.PATIENT_CREATE)
  @ResponseMessage('Consentement enregistré.')
  enregistrerConsentement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnregistrerConsentementDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.patientsService.enregistrerConsentement(id, dto.type, dto.valeur, currentUser.sub);
  }
}
