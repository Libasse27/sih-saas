import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EtablissementStatut, JwtPayload, Scope } from '@sih-saas/shared';
import { EtablissementsService } from '../../modules/etablissements/application/etablissements.service';
import { ALLOW_SUBSCRIPTION_INACTIVE_KEY } from '../decorators/allow-subscription-inactive.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Applique réellement les statuts EXPIRE/SUSPENDU (gap identifié à l'audit du 2026-06-21 — ces
 * statuts existaient depuis la Phase 1/4 mais ne bloquaient jamais rien). Volontairement scopé au
 * SEUL périmètre ETABLISSEMENT (le personnel) — jamais PATIENT : un patient garde l'accès à son
 * dossier/sa messagerie même si SON établissement n'a pas payé son abonnement plateforme, ce serait
 * une double-peine sur un tiers innocent. PLATFORM n'est jamais concerné (pas d'etablissementId).
 */
@Injectable()
export class SubscriptionStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly etablissementsService: EtablissementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const allowInactive = this.reflector.getAllAndOverride<boolean>(ALLOW_SUBSCRIPTION_INACTIVE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic || allowInactive) {
      return true;
    }

    const user: JwtPayload | undefined = context.switchToHttp().getRequest().user;
    if (!user || user.scope !== Scope.ETABLISSEMENT) {
      return true;
    }

    const etablissement = await this.etablissementsService.findById(user.etablissementId!);
    if (etablissement.statut === EtablissementStatut.SUSPENDU || etablissement.statut === EtablissementStatut.EXPIRE) {
      const motif = etablissement.statut === EtablissementStatut.SUSPENDU ? 'suspendu' : 'expiré';
      throw new ForbiddenException(
        `Abonnement ${motif} — renouvelez votre abonnement pour retrouver l'accès (voir « Mon abonnement »).`,
      );
    }

    return true;
  }
}
