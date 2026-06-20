<script setup lang="ts">
import { TypeReduction } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import dayjs, { type Dayjs } from 'dayjs';
import { reactive, ref, watch } from 'vue';
import * as couponsService from '../../services/coupons.service';
import type { Coupon, CouponFormData } from '../../services/coupons.service';

const props = defineProps<{ open: boolean; coupon: Coupon | null }>();
const emit = defineEmits<{ (e: 'update:open', valeur: boolean): void; (e: 'saved'): void }>();

function formulaireVide(): CouponFormData {
  return {
    code: '',
    typeReduction: TypeReduction.POURCENTAGE,
    valeur: 10,
    description: '',
    dateDebut: new Date().toISOString(),
    dateFin: new Date().toISOString(),
    limiteUtilisation: -1,
  };
}

const formulaire = reactive<CouponFormData>(formulaireVide());
const periode = ref<[Dayjs, Dayjs]>([dayjs(), dayjs().add(1, 'month')]);
const enregistrement = ref(false);

watch(
  () => [props.open, props.coupon] as const,
  ([estOuvert, coupon]) => {
    if (!estOuvert) return;
    if (coupon) {
      Object.assign(formulaire, {
        code: coupon.code,
        typeReduction: coupon.typeReduction,
        valeur: coupon.valeur,
        description: coupon.description ?? '',
        dateDebut: coupon.dateDebut,
        dateFin: coupon.dateFin,
        limiteUtilisation: coupon.limiteUtilisation,
      });
      periode.value = [dayjs(coupon.dateDebut), dayjs(coupon.dateFin)];
    } else {
      Object.assign(formulaire, formulaireVide());
      periode.value = [dayjs(), dayjs().add(1, 'month')];
    }
  },
  { immediate: true },
);

function fermer(): void {
  emit('update:open', false);
}

async function soumettre(): Promise<void> {
  enregistrement.value = true;
  try {
    const dto: CouponFormData = {
      ...formulaire,
      dateDebut: periode.value[0].toISOString(),
      dateFin: periode.value[1].toISOString(),
    };
    if (props.coupon) {
      await couponsService.update(props.coupon.id, dto);
      message.success('Coupon mis à jour.');
    } else {
      await couponsService.create(dto);
      message.success('Coupon créé.');
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
    :title="coupon ? `Modifier le coupon « ${coupon.code} »` : 'Nouveau coupon'"
    width="480"
    @update:open="emit('update:open', $event)"
  >
    <a-form layout="vertical" @finish="soumettre">
      <a-form-item label="Code">
        <a-input v-model:value="formulaire.code" placeholder="BIENVENUE20" />
      </a-form-item>

      <a-form-item label="Type de réduction">
        <a-radio-group v-model:value="formulaire.typeReduction">
          <a-radio :value="TypeReduction.POURCENTAGE">Pourcentage</a-radio>
          <a-radio :value="TypeReduction.MONTANT_FIXE">Montant fixe (FCFA)</a-radio>
        </a-radio-group>
      </a-form-item>

      <a-form-item :label="formulaire.typeReduction === TypeReduction.POURCENTAGE ? 'Valeur (%)' : 'Valeur (FCFA)'">
        <a-input-number v-model:value="formulaire.valeur" :min="0" style="width: 100%" />
      </a-form-item>

      <a-form-item label="Description">
        <a-textarea v-model:value="formulaire.description" :rows="2" />
      </a-form-item>

      <a-form-item label="Période de validité">
        <a-range-picker v-model:value="periode" style="width: 100%" />
      </a-form-item>

      <a-form-item label="Limite d'utilisation (-1 = illimité)">
        <a-input-number v-model:value="formulaire.limiteUtilisation" :min="-1" style="width: 100%" />
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
