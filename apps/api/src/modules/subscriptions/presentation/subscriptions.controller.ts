import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { SubscriptionsService } from '../application/subscriptions.service';
import { ExtendSubscriptionDto } from './dto/extend-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@ApiTags('Abonnements (plateforme)')
@ApiBearerAuth()
@Controller('subscriptions')
@Scopes(Scope.PLATFORM)
@RequirePermissions(Permission.ABONNEMENT_PLATEFORME_MANAGE)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // Déclarée avant ":id" pour que "statistiques" ne soit jamais capturé par le paramètre.
  @Get('statistiques')
  @ResponseMessage('Statistiques plateforme.')
  getStatistiques() {
    return this.subscriptionsService.getStatistiquesPlateforme();
  }

  @Get(':id')
  @ResponseMessage('Abonnement récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.findById(id);
  }

  @Patch(':id')
  @ResponseMessage('Abonnement mis à jour.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.subscriptionsService.updateStatut(id, dto, currentUser.sub);
  }

  @Patch(':id/extend')
  @ResponseMessage('Abonnement prolongé.')
  extend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendSubscriptionDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.subscriptionsService.extend(id, dto.jours, currentUser.sub);
  }

  @Patch(':id/migrer-plan')
  @ResponseMessage('Abonnement migré vers la dernière version du plan.')
  migratePlan(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.subscriptionsService.migratePlan(id, currentUser.sub);
  }
}
