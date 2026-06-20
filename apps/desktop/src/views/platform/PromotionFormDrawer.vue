<script setup lang="ts">
import { message } from 'ant-design-vue';
import dayjs, { type Dayjs } from 'dayjs';
import { reactive, ref, watch } from 'vue';
import * as promotionsService from '../../services/promotions.service';
import type { Promotion, PromotionFormData } from '../../services/promotions.service';

const props = defineProps<{ open: boolean; promotion: Promotion | null }>();
const emit = defineEmits<{ (e: 'update:open', valeur: boolean): void; (e: 'saved'): void }>();

function formulaireVide(): Omit<PromotionFormData, 'periodeDebut' | 'periodeFin'> {
  return { nom: '', description: '' };
}

const formulaire = reactive(formulaireVide());
const regleTexte = ref('{}');
const periode = ref<[Dayjs, Dayjs]>([dayjs(), dayjs().add(1, 'month')]);
const enregistrement = ref(false);

watch(
  () => [props.open, props.promotion] as const,
  ([estOuvert, promotion]) => {
    if (!estOuvert) return;
    if (promotion) {
      Object.assign(formulaire, { nom: promotion.nom, description: promotion.description ?? '' });
      regleTexte.value = JSON.stringify(promotion.regle, null, 2);
      periode.value = [dayjs(promotion.periodeDebut), dayjs(promotion.periodeFin)];
    } else {
      Object.assign(formulaire, formulaireVide());
      regleTexte.value = '{}';
      periode.value = [dayjs(), dayjs().add(1, 'month')];
    }
  },
  { immediate: true },
);

function fermer(): void {
  emit('update:open', false);
}

async function soumettre(): Promise<void> {
  let regle: Record<string, unknown>;
  try {
    regle = regleTexte.value.trim() ? JSON.parse(regleTexte.value) : {};
  } catch {
    message.error('Le champ « règle » doit être un JSON valide (ou vide).');
    return;
  }

  enregistrement.value = true;
  try {
    const dto: PromotionFormData = {
      ...formulaire,
      regle,
      periodeDebut: periode.value[0].toISOString(),
      periodeFin: periode.value[1].toISOString(),
    };
    if (props.promotion) {
      await promotionsService.update(props.promotion.id, dto);
      message.success('Promotion mise à jour.');
    } else {
      await promotionsService.create(dto);
      message.success('Promotion créée.');
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
    :title="promotion ? `Modifier la promotion « ${promotion.nom} »` : 'Nouvelle promotion'"
    width="480"
    @update:open="emit('update:open', $event)"
  >
    <a-form layout="vertical" @finish="soumettre">
      <a-form-item label="Nom">
        <a-input v-model:value="formulaire.nom" placeholder="Lancement Q3" />
      </a-form-item>

      <a-form-item label="Description">
        <a-textarea v-model:value="formulaire.description" :rows="2" />
      </a-form-item>

      <a-form-item label="Période">
        <a-range-picker v-model:value="periode" style="width: 100%" />
      </a-form-item>

      <a-form-item label="Règle (JSON libre — référence interne, non interprétée par le backend)">
        <a-textarea v-model:value="regleTexte" :rows="4" />
      </a-form-item>

      <a-form-item>
        <a-space>
          <a-button type="primary" html-type="submit" :loading="enregistrement">Enregistrer</a-button>
          <a-button @click="fermer">Annuler</a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </a-drawer>
</template>
