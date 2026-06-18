import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClinicalModule, JwtPayload } from '@sih-saas/shared';
import { SubscriptionsService } from '../application/subscriptions.service';
import { PLAN_FEATURE_KEY } from './require-plan-feature.decorator';

@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<ClinicalModule | undefined>(PLAN_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredModule) {
      return true;
    }

    const user: JwtPayload = context.switchToHttp().getRequest().user;
    const hasModule = await this.subscriptionsService.hasModule(user.etablissementId!, requiredModule);
    if (!hasModule) {
      throw new ForbiddenException(
        `Le module "${requiredModule}" n'est pas inclus dans votre forfait actuel.`,
      );
    }

    return true;
  }
}
