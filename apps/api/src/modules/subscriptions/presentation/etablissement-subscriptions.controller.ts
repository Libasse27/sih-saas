import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { AllowSubscriptionInactive } from '../../../shared/decorators/allow-subscription-inactive.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { SubscriptionsService } from '../application/subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@ApiTags('Abonnements (établissement)')
@ApiBearerAuth()
@Controller('etablissements')
export class EtablissementSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me/subscription')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.ABONNEMENT_ETABLISSEMENT_VIEW)
  @AllowSubscriptionInactive()
  @ResponseMessage('Abonnement de mon établissement.')
  async findMine(@CurrentUser() currentUser: JwtPayload) {
    const subscription = await this.subscriptionsService.getActiveForEtablissement(currentUser.etablissementId!);
    if (!subscription) {
      throw new NotFoundException('Aucun abonnement actif pour votre établissement.');
    }
    return subscription;
  }

  @Post(':etablissementId/subscriptions')
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.ABONNEMENT_PLATEFORME_MANAGE)
  @ResponseMessage('Abonnement créé pour cet établissement.')
  create(
    @Param('etablissementId', ParseUUIDPipe) etablissementId: string,
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.subscriptionsService.subscribe(etablissementId, dto, currentUser.sub);
  }

  @Get(':etablissementId/subscriptions/active')
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.ABONNEMENT_PLATEFORME_MANAGE)
  @ResponseMessage('Abonnement actif de cet établissement.')
  async findActive(@Param('etablissementId', ParseUUIDPipe) etablissementId: string) {
    const subscription = await this.subscriptionsService.getActiveForEtablissement(etablissementId);
    if (!subscription) {
      throw new NotFoundException('Aucun abonnement actif pour cet établissement.');
    }
    return subscription;
  }
}
