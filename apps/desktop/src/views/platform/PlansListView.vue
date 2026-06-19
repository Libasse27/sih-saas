<script setup lang="ts">
import { message } from 'ant-design-vue';
import { onMounted, ref } from 'vue';
import * as plansService from '../../services/plans.service';
import type { Plan } from '../../services/plans.service';
import PlanFormDrawer from './PlanFormDrawer.vue';

const colonnes = [
  { title: 'Code', dataIndex: 'code', key: 'code' },
  { title: 'Nom', dataIndex: 'nom', key: 'nom' },
  { title: 'Mensuel', key: 'mensuel' },
  { title: 'Annuel', key: 'annuel' },
  { title: 'Modules', key: 'modules' },
  { title: 'Statut', key: 'statut' },
  { title: 'Version', dataIndex: 'version', key: 'version' },
  { title: 'Actions', key: 'actions' },
];

const items = ref<Plan[]>([]);
const chargement = ref(false);
const drawerOuvert = ref(false);
const planEnEdition = ref<Plan | null>(null);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    items.value = await plansService.findAllAdmin();
  } finally {
    chargement.value = false;
  }
}

function ouvrirCreation(): void {
  planEnEdition.value = null;
  drawerOuvert.value = true;
}

function ouvrirEdition(plan: Plan): void {
  planEnEdition.value = plan;
  drawerOuvert.value = true;
}

async function basculerActif(plan: Plan): Promise<void> {
  if (plan.actif) {
    await plansService.desactiver(plan.id);
    message.success('Forfait désactivé.');
  } else {
    await plansService.activer(plan.id);
    message.success('Forfait activé.');
  }
  await charger();
}

onMounted(charger);
</script>

<template>
  <div>
    <div class="entete">
      <h2>Forfaits</h2>
      <a-button type="primary" @click="ouvrirCreation">Nouveau forfait</a-button>
    </div>

    <a-table :columns="colonnes" :data-source="items" :loading="chargement" row-key="id" :pagination="false">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'mensuel'">{{ record.tarifs.mensuel }} {{ record.tarifs.devise }}</template>
        <template v-else-if="column.key === 'annuel'">{{ record.tarifs.annuel }} {{ record.tarifs.devise }}</template>
        <template v-else-if="column.key === 'modules'">{{ record.modules.length }} module(s)</template>
        <template v-else-if="column.key === 'statut'">
          <a-tag :color="record.actif ? 'green' : 'default'">{{ record.actif ? 'Actif' : 'Inactif' }}</a-tag>
          <a-tag v-if="!record.visible" color="orange">Masqué</a-tag>
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

    <PlanFormDrawer v-model:open="drawerOuvert" :plan="planEnEdition" @saved="charger" />
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
