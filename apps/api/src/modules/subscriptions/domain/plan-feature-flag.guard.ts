import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload, PlanFeatures } from '@sih-saas/shared';
import { SubscriptionsService } from '../application/subscriptions.service';
import { PLAN_FEATURE_FLAG_KEY } from './require-plan-feature-flag.decorator';

/** Symétrique de `PlanFeatureGuard` mais pour une capacité technique (`PlanFeatures`) plutôt qu'un module métier. */
@Injectable()
export class PlanFeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<keyof PlanFeatures | undefined>(
      PLAN_FEATURE_FLAG_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredFeature) {
      return true;
    }

    const user: JwtPayload = context.switchToHttp().getRequest().user;
    const hasFeature = await this.subscriptionsService.hasFeature(user.etablissementId!, requiredFeature);
    if (!hasFeature) {
      throw new ForbiddenException(
        `La fonctionnalité "${requiredFeature}" n'est pas incluse dans votre forfait actuel.`,
      );
    }

    return true;
  }
}
