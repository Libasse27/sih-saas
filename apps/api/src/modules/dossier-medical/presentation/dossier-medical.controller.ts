import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { CareContextGuard } from '../../../shared/guards/care-context.guard';
import { PatientsService } from '../../patients/application/patients.service';
import { DossierMedicalService } from '../application/dossier-medical.service';
import { AjouterCompteRenduDto } from './dto/ajouter-compte-rendu.dto';
import { AjouterObservationDto } from './dto/ajouter-observation.dto';
import { UpdateAntecedentsDto } from './dto/update-antecedents.dto';

@ApiTags('Dossier médical')
@ApiBearerAuth()
@Controller('patients')
export class DossierMedicalController {
  constructor(
    private readonly dossierMedicalService: DossierMedicalService,
    private readonly patientsService: PatientsService,
  ) {}

  // Déclaré avant ":patientId/dossier" pour que "me" ne soit jamais capturé par le paramètre.
  @Get('me/dossier')
  @Scopes(Scope.PATIENT)
  @ResponseMessage('Mon dossier médical.')
  async findMyDossier(@CurrentUser() currentUser: JwtPayload) {
    const patient = await this.patientsService.findByUserId(currentUser.sub);
    if (!patient) {
      throw new NotFoundException('Aucun dossier patient associé à ce compte.');
    }
    return this.dossierMedicalService.getOrCreate(patient.id);
  }

  @Get(':patientId/dossier')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.DOSSIER_READ)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Dossier médical récupéré.')
  findDossier(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.dossierMedicalService.getOrCreate(patientId);
  }

  @Post(':patientId/dossier/observations')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.DOSSIER_WRITE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Observation ajoutée au dossier.')
  ajouterObservation(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: AjouterObservationDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.dossierMedicalService.ajouterObservation(
      patientId,
      { ...dto, auteurId: currentUser.sub },
      currentUser.etablissementId!,
    );
  }

  @Patch(':patientId/dossier/antecedents')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.DOSSIER_WRITE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Antécédents mis à jour.')
  mettreAJourAntecedents(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: UpdateAntecedentsDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.dossierMedicalService.mettreAJourAntecedents(
      patientId,
      {
        ...dto,
        allergies: dto.allergies?.map((allergie) => ({
          ...allergie,
          dateConstatee: allergie.dateConstatee ? new Date(allergie.dateConstatee) : undefined,
        })),
      },
      currentUser.etablissementId!,
      currentUser.sub,
    );
  }

  @Post(':patientId/dossier/comptes-rendus')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.DOSSIER_WRITE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Compte rendu ajouté au dossier.')
  ajouterCompteRendu(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: AjouterCompteRenduDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.dossierMedicalService.ajouterCompteRendu(
      patientId,
      { ...dto, auteurId: currentUser.sub },
      currentUser.etablissementId!,
    );
  }
}
