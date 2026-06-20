import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CareContextGuard } from '../../../shared/guards/care-context.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { SocialService } from '../application/social.service';
import { CreateNoteSocialeDto } from './dto/create-note-sociale.dto';

/**
 * Nichée sous /patients/:patientId/notes-sociales (CareContextGuard résout :patientId, comme
 * DossierMedicalController/ConsultationsController). matrice-rbac.md §"ASSISTANT_SOCIAL" : seule
 * la LECTURE (`dossier:read`) est marquée 🩺 — l'écriture (`social:manage`) ne l'est pas, donc pas
 * de CareContextGuard sur `create` (intervention sociale possible avant tout lien de soin établi).
 */
@ApiTags('Social')
@ApiBearerAuth()
@Controller('patients/:patientId/notes-sociales')
@Scopes(Scope.ETABLISSEMENT)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post()
  @RequirePermissions(Permission.SOCIAL_MANAGE)
  @ResponseMessage('Note sociale enregistrée.')
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateNoteSocialeDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.socialService.create(patientId, dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.DOSSIER_READ)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Notes sociales du patient.')
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.socialService.findAllForPatient(patientId);
  }
}
