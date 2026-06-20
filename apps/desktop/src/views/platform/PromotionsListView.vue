<script setup lang="ts">
import { message } from 'ant-design-vue';
import { onMounted, ref } from 'vue';
import * as promotionsService from '../../services/promotions.service';
import type { Promotion } from '../../services/promotions.service';
import PromotionFormDrawer from './PromotionFormDrawer.vue';

const colonnes = [
  { title: 'Nom', dataIndex: 'nom', key: 'nom' },
  { title: 'Description', dataIndex: 'description', key: 'description' },
  { title: 'Période', key: 'periode' },
  { title: 'Statut', key: 'statut' },
  { title: 'Actions', key: 'actions' },
];

const items = ref<Promotion[]>([]);
const chargement = ref(false);
const drawerOuvert = ref(false);
const promotionEnEdition = ref<Promotion | null>(null);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    items.value = await promotionsService.findAll();
  } finally {
    chargement.value = false;
  }
}

function ouvrirCreation(): void {
  promotionEnEdition.value = null;
  drawerOuvert.value = true;
}

function ouvrirEdition(promotion: Promotion): void {
  promotionEnEdition.value = promotion;
  drawerOuvert.value = true;
}

async function basculerActif(promotion: Promotion): Promise<void> {
  if (promotion.actif) {
    await promotionsService.desactiver(promotion.id);
    message.success('Promotion désactivée.');
  } else {
    await promotionsService.activer(promotion.id);
    message.success('Promotion activée.');
  }
  await charger();
}

onMounted(charger);
</script>

<template>
  <div>
    <div class="entete">
      <h2>Promotions</h2>
      <a-button type="primary" @click="ouvrirCreation">Nouvelle promotion</a-button>
    </div>

    <a-alert
      type="info"
      show-icon
      message="Annonce uniquement — une promotion n'applique aucune réduction automatique sur les prix. Pour une réduction réelle, utilisez un Coupon."
      style="margin-bottom: 16px"
    />

    <a-table :columns="colonnes" :data-source="items" :loading="chargement" row-key="id" :pagination="false">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'periode'">
          {{ new Date(record.periodeDebut).toLocaleDateString('fr-SN') }} →
          {{ new Date(record.periodeFin).toLocaleDateString('fr-SN') }}
        </template>
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

    <PromotionFormDrawer v-model:open="drawerOuvert" :promotion="promotionEnEdition" @saved="charger" />
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
