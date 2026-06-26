import { SetMetadata } from '@nestjs/common';
import { ModuleMetier } from '@sih-saas/shared';

export const PLAN_FEATURE_KEY = 'planFeature';

/**
 * Déblocage des modules métiers piloté par la donnée (prompt maître §10.4) : lit le planSnapshot
 * de l'abonnement actif, jamais un `if (plan === 'COMPLET')` codé en dur. À utiliser avec
 * `PlanFeatureGuard`, ex. `@RequirePlanFeature(ModuleMetier.IMAGERIE_MEDICALE)`.
 */
export const RequirePlanFeature = (module: ModuleMetier) => SetMetadata(PLAN_FEATURE_KEY, module);
