import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
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
import { CreateConsultationDietetiqueDto } from './dto/create-consultation-dietetique.dto';
import { CreateSeanceReadaptationDto } from './dto/create-seance-readaptation.dto';
import { UpdateAntecedentsDto } from './dto/update-antecedents.dto';

/** Cap mémoire fixe indépendant du quota de stockage de l'établissement (DME_ATTACHMENTS_MAX_TAILLE_MO) —
 * évite de bufferiser un corps multipart démesuré avant même que la logique métier ne s'exécute. */
const TAILLE_MAX_UPLOAD_OCTETS = 25 * 1024 * 1024;

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
    return this.dossierMedicalService.consulter(patient.id, currentUser.etablissementId!, currentUser.sub);
  }

  @Get(':patientId/dossier')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.DOSSIER_READ)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Dossier médical récupéré.')
  findDossier(@Param('patientId', ParseUUIDPipe) patientId: string, @CurrentUser() currentUser: JwtPayload) {
    return this.dossierMedicalService.consulter(patientId, currentUser.etablissementId!, currentUser.sub);
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

  @Post(':patientId/dossier/seances-readaptation')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.DOSSIER_WRITE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Séance de rééducation enregistrée.')
  ajouterSeanceReadaptation(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateSeanceReadaptationDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.dossierMedicalService.ajouterSeanceReadaptation(
      patientId,
      { ...dto, kinesitherapeuteId: currentUser.sub },
      currentUser.etablissementId!,
    );
  }

  @Post(':patientId/dossier/consultations-dietetiques')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.DOSSIER_WRITE)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Consultation diététique enregistrée.')
  ajouterConsultationDietetique(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateConsultationDietetiqueDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.dossierMedicalService.ajouterConsultationDietetique(
      patientId,
      { ...dto, dieteticienId: currentUser.sub },
      currentUser.etablissementId!,
    );
  }

  @Post(':patientId/dossier/pieces-jointes')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.DOSSIER_WRITE)
  @UseGuards(CareContextGuard)
  @UseInterceptors(FileInterceptor('fichier', { limits: { fileSize: TAILLE_MAX_UPLOAD_OCTETS } }))
  @ApiConsumes('multipart/form-data')
  @ResponseMessage('Pièce jointe ajoutée au dossier.')
  ajouterPieceJointe(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @UploadedFile() fichier: Express.Multer.File,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    if (!fichier) {
      throw new BadRequestException('Aucun fichier reçu (champ multipart attendu : "fichier").');
    }

    return this.dossierMedicalService.ajouterPieceJointe(patientId, currentUser.etablissementId!, currentUser.sub, fichier);
  }

  @Get(':patientId/dossier/pieces-jointes/:pieceJointeId/lien')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.DOSSIER_READ)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Lien de téléchargement généré.')
  genererLienPieceJointe(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('pieceJointeId') pieceJointeId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.dossierMedicalService.genererLienTelechargementPieceJointe(
      patientId,
      currentUser.etablissementId!,
      pieceJointeId,
      currentUser.sub,
    );
  }
}
