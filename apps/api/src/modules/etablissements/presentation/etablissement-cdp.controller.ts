import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { EtablissementsService } from '../application/etablissements.service';
import { UpdateEtablissementCdpDto } from './dto/update-etablissement-cdp.dto';

/**
 * Self-service établissement (Phase 24) — distinct de EtablissementsController (super-admin,
 * Phase 23, scope PLATFORM), qui garde un droit de regard plateforme sur le même dossier. C'est
 * pourtant l'établissement, pas l'opérateur plateforme, qui mène réellement la démarche auprès de
 * la CDP — d'où ce contrôleur séparé, jamais d'`:id` en paramètre : toujours `currentUser.etablissementId`.
 */
@ApiTags('Établissements (auto-service)')
@ApiBearerAuth()
@Controller('etablissements')
export class EtablissementCdpController {
  constructor(private readonly etablissementsService: EtablissementsService) {}

  @Get('me/cdp')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
  @ResponseMessage('Dossier d’autorisation CDP de mon établissement.')
  findMine(@CurrentUser() currentUser: JwtPayload) {
    return this.etablissementsService.findById(currentUser.etablissementId!);
  }

  @Patch('me/cdp')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
  @ResponseMessage('Dossier d’autorisation CDP mis à jour.')
  updateMine(@Body() dto: UpdateEtablissementCdpDto, @CurrentUser() currentUser: JwtPayload) {
    return this.etablissementsService.updateCdp(currentUser.etablissementId!, dto, currentUser.sub);
  }
}
