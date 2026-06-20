<script setup lang="ts">
import { ClinicalModule } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { reactive, ref, watch } from 'vue';
import * as plansService from '../../services/plans.service';
import type { Plan, PlanFormData } from '../../services/plans.service';

const props = defineProps<{ open: boolean; plan: Plan | null }>();
const emit = defineEmits<{ (e: 'update:open', valeur: boolean): void; (e: 'saved'): void }>();

const LIBELLE_MODULE: Record<ClinicalModule, string> = {
  [ClinicalModule.DME]: 'Dossier médical (DME)',
  [ClinicalModule.RDV]: 'Rendez-vous',
  [ClinicalModule.ADMISSIONS]: 'Admissions / Lits',
  [ClinicalModule.PHARMACIE]: 'Pharmacie',
  [ClinicalModule.LABORATOIRE]: 'Laboratoire',
  [ClinicalModule.IMAGERIE]: 'Imagerie',
  [ClinicalModule.FACTURATION]: 'Facturation patient',
  [ClinicalModule.TELEMEDECINE]: 'Télémédecine',
  [ClinicalModule.API]: 'Accès API',
};

function formulaireVide(): PlanFormData {
  return {
    code: '',
    nom: '',
    description: '',
    tarifs: { mensuel: 0, annuel: 0, devise: 'XOF' },
    limites: { maxUtilisateurs: 5, maxLits: 20, maxStockageMo: 1000 },
    modules: [],
    features: { supportPrioritaire: false, apiAccess: false, multiSites: false },
    essaiGratuitJours: 0,
    visible: true,
    ordreAffichage: 0,
  };
}

const formulaire = reactive<PlanFormData>(formulaireVide());
const enregistrement = ref(false);

watch(
  () => [props.open, props.plan] as const,
  ([estOuvert, plan]) => {
    if (!estOuvert) return;
    Object.assign(
      formulaire,
      plan
        ? {
            code: plan.code,
            nom: plan.nom,
            description: plan.description ?? '',
            tarifs: { ...plan.tarifs },
            limites: { ...plan.limites },
            modules: [...plan.modules],
            features: { ...plan.features },
            essaiGratuitJours: plan.essaiGratuitJours,
            visible: plan.visible,
            ordreAffichage: plan.ordreAffichage,
          }
        : formulaireVide(),
    );
  },
  { immediate: true },
);

function fermer(): void {
  emit('update:open', false);
}

async function soumettre(): Promise<void> {
  enregistrement.value = true;
  try {
    if (props.plan) {
      await plansService.update(props.plan.id, formulaire);
      message.success('Forfait mis à jour.');
    } else {
      await plansService.create(formulaire);
      message.success('Forfait créé.');
    }
    emit('saved');
    fermer();
  } finally {
    enregistrement.value = false;
  }
}
</script>

<template>
  <a-drawer
    :open="open"
    :title="plan ? `Modifier le forfait « ${plan.nom} »` : 'Nouveau forfait'"
    width="520"
    @update:open="emit('update:open', $event)"
  >
    <a-form layout="vertical" @finish="soumettre">
      <a-form-item label="Code">
        <a-input v-model:value="formulaire.code" placeholder="STANDARD" />
      </a-form-item>
      <a-form-item label="Nom">
        <a-input v-model:value="formulaire.nom" />
      </a-form-item>
      <a-form-item label="Description">
        <a-textarea v-model:value="formulaire.description" :rows="2" />
      </a-form-item>

      <a-divider>Tarifs</a-divider>
      <a-space>
        <a-form-item label="Mensuel (FCFA)">
          <a-input-number v-model:value="formulaire.tarifs.mensuel" :min="0" />
        </a-form-item>
        <a-form-item label="Annuel (FCFA)">
          <a-input-number v-model:value="formulaire.tarifs.annuel" :min="0" />
        </a-form-item>
      </a-space>

      <a-divider>Limites (-1 = illimité)</a-divider>
      <a-space>
        <a-form-item label="Utilisateurs max">
          <a-input-number v-model:value="formulaire.limites.maxUtilisateurs" :min="-1" />
        </a-form-item>
        <a-form-item label="Lits max">
          <a-input-number v-model:value="formulaire.limites.maxLits" :min="-1" />
        </a-form-item>
        <a-form-item label="Stockage max (Mo)">
          <a-input-number v-model:value="formulaire.limites.maxStockageMo" :min="-1" />
        </a-form-item>
      </a-space>

      <a-divider>Modules cliniques inclus</a-divider>
      <a-checkbox-group v-model:value="formulaire.modules">
        <a-row>
          <a-col v-for="module in Object.values(ClinicalModule)" :key="module" :span="12">
            <a-checkbox :value="module">{{ LIBELLE_MODULE[module] }}</a-checkbox>
          </a-col>
        </a-row>
      </a-checkbox-group>

      <a-divider>Fonctionnalités</a-divider>
      <a-checkbox v-model:checked="formulaire.features.supportPrioritaire">Support prioritaire</a-checkbox><br />
      <a-checkbox v-model:checked="formulaire.features.apiAccess">Accès API</a-checkbox><br />
      <a-checkbox v-model:checked="formulaire.features.multiSites">Multi-sites</a-checkbox>

      <a-divider>Autres paramètres</a-divider>
      <a-space>
        <a-form-item label="Essai gratuit (jours)">
          <a-input-number v-model:value="formulaire.essaiGratuitJours" :min="0" />
        </a-form-item>
        <a-form-item label="Ordre d'affichage">
          <a-input-number v-model:value="formulaire.ordreAffichage" :min="0" />
        </a-form-item>
        <a-form-item label="Visible publiquement">
          <a-switch v-model:checked="formulaire.visible" />
        </a-form-item>
      </a-space>

      <a-form-item>
        <a-space>
          <a-button type="primary" html-type="submit" :loading="enregistrement">Enregistrer</a-button>
          <a-button @click="fermer">Annuler</a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </a-drawer>
</template>
