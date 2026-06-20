<script setup lang="ts">
import { TypeReduction } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, ref } from 'vue';
import * as couponsService from '../../services/coupons.service';
import type { Coupon } from '../../services/coupons.service';
import CouponFormDrawer from './CouponFormDrawer.vue';

const colonnes = [
  { title: 'Code', dataIndex: 'code', key: 'code' },
  { title: 'Réduction', key: 'reduction' },
  { title: 'Période', key: 'periode' },
  { title: 'Utilisations', key: 'utilisations' },
  { title: 'Statut', key: 'statut' },
  { title: 'Actions', key: 'actions' },
];

const items = ref<Coupon[]>([]);
const chargement = ref(false);
const drawerOuvert = ref(false);
const couponEnEdition = ref<Coupon | null>(null);

function rendreReduction(coupon: Coupon): string {
  return coupon.typeReduction === TypeReduction.POURCENTAGE ? `${coupon.valeur} %` : `${coupon.valeur} FCFA`;
}

function rendreUtilisations(coupon: Coupon): string {
  return coupon.limiteUtilisation === -1
    ? `${coupon.utilisationsCount} (illimité)`
    : `${coupon.utilisationsCount} / ${coupon.limiteUtilisation}`;
}

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    items.value = await couponsService.findAll();
  } finally {
    chargement.value = false;
  }
}

function ouvrirCreation(): void {
  couponEnEdition.value = null;
  drawerOuvert.value = true;
}

function ouvrirEdition(coupon: Coupon): void {
  couponEnEdition.value = coupon;
  drawerOuvert.value = true;
}

async function basculerActif(coupon: Coupon): Promise<void> {
  if (coupon.actif) {
    await couponsService.desactiver(coupon.id);
    message.success('Coupon désactivé.');
  } else {
    await couponsService.activer(coupon.id);
    message.success('Coupon activé.');
  }
  await charger();
}

onMounted(charger);
</script>

<template>
  <div>
    <div class="entete">
      <h2>Coupons</h2>
      <a-button type="primary" @click="ouvrirCreation">Nouveau coupon</a-button>
    </div>

    <a-table :columns="colonnes" :data-source="items" :loading="chargement" row-key="id" :pagination="false">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'reduction'">{{ rendreReduction(record) }}</template>
        <template v-else-if="column.key === 'periode'">
          {{ new Date(record.dateDebut).toLocaleDateString('fr-SN') }} →
          {{ new Date(record.dateFin).toLocaleDateString('fr-SN') }}
        </template>
        <template v-else-if="column.key === 'utilisations'">{{ rendreUtilisations(record) }}</template>
        <template v-else-if="column.key === 'statut'">
          <a-tag :color="record.actif ? 'green' : 'default'">{{ record.actif ? 'Actif' : 'Inactif' }}</a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button size="small" @click="ouvrirEdition(record)">Modifier</a-button>
            <a-button size="small" :danger="record.actif" @click="basculerActif(record)">
              {{ record.actif ? 'Désactiver' : 'Activer' }}
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <CouponFormDrawer v-model:open="drawerOuvert" :coupon="couponEnEdition" @saved="charger" />
  </div>
</template>

<style scoped>
.entete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
</style>
