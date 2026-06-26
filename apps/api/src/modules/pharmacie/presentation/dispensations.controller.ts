import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { DispensationsService } from '../application/dispensations.service';
import { CreateDispensationDto } from './dto/create-dispensation.dto';

/** Pas de CareContextGuard : la prescription VALIDEE est déjà la chaîne d'autorisation (voir plan Phase 7). */
@ApiTags('Pharmacie — Dispensations')
@ApiBearerAuth()
@Controller('dispensations')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.PHARMACIE)
export class DispensationsController {
  constructor(private readonly dispensationsService: DispensationsService) {}

  @Post()
  @RequirePermissions(Permission.DISPENSATION_CREATE)
  @ResponseMessage('Dispensation enregistrée, stock décrémenté, prescription clôturée.')
  create(@Body() dto: CreateDispensationDto, @CurrentUser() currentUser: JwtPayload) {
    return this.dispensationsService.create(dto, currentUser.sub);
  }
}
