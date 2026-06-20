import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicalModule, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { ApiKeysService } from '../application/api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

/** Clés API scopées par établissement (Phase 11) — gardées par le module de forfait `apiAccess` (prérequis du module FHIR). */
@ApiTags('Clés API')
@ApiBearerAuth()
@Controller('etablissements')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ClinicalModule.API)
@RequirePermissions(Permission.API_KEY_MANAGE)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post('me/api-keys')
  @ResponseMessage('Clé API créée — notez-la, elle ne sera plus jamais affichée.')
  create(@Body() dto: CreateApiKeyDto, @CurrentUser() currentUser: JwtPayload) {
    return this.apiKeysService.create(currentUser.etablissementId!, dto, currentUser.sub);
  }

  @Get('me/api-keys')
  @ResponseMessage('Clés API de mon établissement.')
  findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.apiKeysService.findAllForEtablissement(currentUser.etablissementId!);
  }

  @Patch('me/api-keys/:id/revoquer')
  @ResponseMessage('Clé API révoquée.')
  revoquer(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.apiKeysService.revoquer(id, currentUser.etablissementId!, currentUser.sub);
  }
}
