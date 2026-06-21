import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { AllowSubscriptionInactive } from '../../../shared/decorators/allow-subscription-inactive.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { EtablissementsService } from '../application/etablissements.service';
import { UpdateEtablissementProfilDto } from './dto/update-etablissement-profil.dto';

/**
 * Self-service établissement (gap audit du 2026-06-21 : aucun profil général self-service n'existait,
 * seul `/me/cdp` — Phase 24 — couvrait un sous-ensemble très spécifique). Même convention que
 * EtablissementCdpController : jamais d'`:id`, toujours `currentUser.etablissementId`. Doit rester
 * enregistré AVANT EtablissementsController dans le module (même piège de routing que Phase 24 —
 * `:id/...` capturerait sinon `me` comme `id="me"`).
 */
@ApiTags('Établissements (auto-service)')
@ApiBearerAuth()
@Controller('etablissements')
export class EtablissementProfilController {
  constructor(private readonly etablissementsService: EtablissementsService) {}

  @Get('me')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
  @AllowSubscriptionInactive()
  @ResponseMessage('Profil de mon établissement.')
  findMine(@CurrentUser() currentUser: JwtPayload) {
    return this.etablissementsService.findById(currentUser.etablissementId!);
  }

  @Patch('me')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
  @AllowSubscriptionInactive()
  @ResponseMessage('Profil de mon établissement mis à jour.')
  updateMine(@Body() dto: UpdateEtablissementProfilDto, @CurrentUser() currentUser: JwtPayload) {
    return this.etablissementsService.updateProfil(currentUser.etablissementId!, dto, currentUser.sub);
  }
}
