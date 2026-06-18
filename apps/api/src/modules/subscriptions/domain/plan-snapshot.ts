import { PlanSnapshot } from '@sih-saas/shared';
import { PlanEntity } from '../../plans/infrastructure/entities/plan.entity';

/** Copie figée et indépendante (pas de référence partagée) — voir subscription.entity.ts. */
export function buildPlanSnapshot(plan: PlanEntity): PlanSnapshot {
  return {
    planId: plan.id,
    code: plan.code,
    nom: plan.nom,
    tarifs: { ...plan.tarifs },
    limites: { ...plan.limites },
    modules: [...plan.modules],
    features: { ...plan.features },
    version: plan.version,
  };
}

export function calculerMontant(snapshot: PlanSnapshot, periodicite: 'MENSUEL' | 'ANNUEL'): number {
  return periodicite === 'MENSUEL' ? snapshot.tarifs.mensuel : snapshot.tarifs.annuel;
}
