import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { AllowSubscriptionInactive } from '../../../shared/decorators/allow-subscription-inactive.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaymentsService } from '../application/payments.service';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';

/**
 * Renouvellement self-service (gap audit du 2026-06-21 : `Permission.ABONNEMENT_ETABLISSEMENT_RENEW`
 * seedée à ADMIN_ETABLISSEMENT/DIRECTEUR depuis l'origine mais jamais consommée par aucun contrôleur).
 * Délibérément un contrôleur séparé dans PaymentsModule plutôt qu'ajouté à SubscriptionsModule :
 * SubscriptionsModule -> PaymentsModule créerait un cycle (PaymentsModule -> ProvisioningModule ->
 * SubscriptionsModule existe déjà) — PaymentsService est déjà disponible ici sans rien importer de plus.
 * `@AllowSubscriptionInactive()` : c'est exactement la route qui doit rester joignable quand
 * l'établissement est EXPIRE/SUSPENDU (SubscriptionStatusGuard), sinon impossible de sortir de cet état.
 */
@ApiTags('Abonnements (établissement)')
@ApiBearerAuth()
@Controller('etablissements/me/subscription')
@Scopes(Scope.ETABLISSEMENT)
@RequirePermissions(Permission.ABONNEMENT_ETABLISSEMENT_RENEW)
@AllowSubscriptionInactive()
export class EtablissementRenewalController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('renouveler')
  @ResponseMessage('Paiement de renouvellement initié.')
  renouveler(@Body() dto: RenewSubscriptionDto, @CurrentUser() currentUser: JwtPayload) {
    return this.paymentsService.initier({
      etablissementId: currentUser.etablissementId!,
      planId: dto.planId,
      periodicite: dto.periodicite,
      couponCode: dto.couponCode,
    });
  }
}
