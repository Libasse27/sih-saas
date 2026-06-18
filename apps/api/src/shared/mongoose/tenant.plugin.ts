import { Scope } from '@sih-saas/shared';
import { Schema } from 'mongoose';
import { tenantAls } from '../tenant/tenant-context.storage';

const FILTERED_QUERY_HOOKS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'countDocuments',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
] as const;

/**
 * Plugin Mongoose tenant — à appliquer sur tout schéma du domaine clinique (Phase 5+ : DossierMedical, etc.).
 * Injecte etablissementId à la création, le rend immuable, et filtre automatiquement toutes les lectures/
 * écritures. Le périmètre PLATFORM peut explicitement bypasser via `.setOptions({ bypassTenantScope: true })`.
 * Référence : docs/phase-0/strategie-isolation.md §3.
 *
 * Singleton `tenantAls` importé directement (pas d'injection Nest) : les hooks Mongoose s'exécutent
 * hors du conteneur DI.
 */
export function tenantPlugin(schema: Schema): void {
  if (!schema.path('etablissementId')) {
    schema.add({ etablissementId: { type: String, required: true, index: true } });
  }

  // pre('validate') et non pre('save') : Mongoose valide le document (donc le `required: true`
  // sur etablissementId) AVANT d'exécuter les hooks pre('save') — il faut injecter la valeur plus tôt.
  schema.pre('validate', function tagEtablissementId(next) {
    const store = tenantAls.getStore();

    if (this.isNew) {
      if (!store?.etablissementId) {
        return next(new Error('Contexte tenant manquant : impossible de créer ce document.'));
      }
      this.set('etablissementId', store.etablissementId);
    } else if (this.isModified('etablissementId')) {
      return next(new Error('etablissementId est immuable après création.'));
    }

    next();
  });

  schema.pre('insertMany', function tagEtablissementIdMany(next, docs: Array<Record<string, unknown>>) {
    const store = tenantAls.getStore();
    if (!store?.etablissementId) {
      return next(new Error('Contexte tenant manquant : impossible de créer ces documents.'));
    }
    for (const doc of docs) {
      doc.etablissementId = store.etablissementId;
    }
    next();
  });

  function applyTenantFilter(this: { getOptions: () => Record<string, unknown>; where: (cond: object) => void }) {
    const options = this.getOptions();
    const store = tenantAls.getStore();

    if (options.bypassTenantScope) {
      if (store?.scope !== Scope.PLATFORM) {
        throw new Error('bypassTenantScope est réservé au périmètre PLATFORM.');
      }
      return;
    }

    if (!store?.etablissementId) {
      throw new Error('Contexte tenant manquant pour cette requête.');
    }

    this.where({ etablissementId: store.etablissementId });
  }

  for (const hook of FILTERED_QUERY_HOOKS) {
    schema.pre(hook, applyTenantFilter);
  }
}
