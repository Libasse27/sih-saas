import { SetMetadata } from '@nestjs/common';
import { PlanFeatures } from '@sih-saas/shared';

export const PLAN_FEATURE_FLAG_KEY = 'planFeatureFlag';

/**
 * Déblocage d'une capacité technique transversale (`PlanFeatures`, ex. `apiAccess`) — distincte
 * d'un module métier (`RequirePlanFeature`/`ModuleMetier`) car ce n'est pas un département de
 * l'établissement mais une option du forfait (prompt maître §10.4). À utiliser avec
 * `PlanFeatureFlagGuard`, ex. `@RequirePlanFeatureFlag('apiAccess')`.
 */
export const RequirePlanFeatureFlag = (feature: keyof PlanFeatures) => SetMetadata(PLAN_FEATURE_FLAG_KEY, feature);
