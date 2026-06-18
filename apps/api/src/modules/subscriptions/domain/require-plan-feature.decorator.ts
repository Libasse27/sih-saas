import { SetMetadata } from '@nestjs/common';
import { ClinicalModule } from '@sih-saas/shared';

export const PLAN_FEATURE_KEY = 'planFeature';

/**
 * Déblocage des modules cliniques piloté par la donnée (prompt maître §8) : lit le planSnapshot
 * de l'abonnement actif, jamais un `if (plan === 'COMPLET')` codé en dur. À utiliser avec
 * `PlanFeatureGuard` sur les futurs endpoints cliniques (Phase 6+), ex. `@RequirePlanFeature(ClinicalModule.IMAGERIE)`.
 */
export const RequirePlanFeature = (module: ClinicalModule) => SetMetadata(PLAN_FEATURE_KEY, module);
