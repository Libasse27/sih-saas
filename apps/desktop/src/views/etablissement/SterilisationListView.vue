<script setup lang="ts">
import { CycleSterilisationStatut } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as sterilisationService from '../../services/sterilisation.service';
import type { CycleSterilisation } from '../../services/sterilisation.service';

const LIBELLE_STATUT: Record<CycleSterilisationStatut, string> = {
  [CycleSterilisationStatut.EN_COURS]: 'En cours',
  [CycleSterilisationStatut.TERMINE]: 'Terminé',
  [CycleSterilisationStatut.REJETE]: 'Rejeté',
};

const COULEUR_STATUT: Record<CycleSterilisationStatut, string> = {
  [CycleSterilisationStatut.EN_COURS]: 'blue',
  [CycleSterilisationStatut.TERMINE]: 'green',
  [CycleSterilisationStatut.REJETE]: 'red',
};

const colonnes = [
  { title: 'Matériel', dataIndex: 'materiel', key: 'materiel' },
  { title: 'N° de lot', dataIndex: 'numeroLot', key: 'numeroLot' },
  { title: 'Début', key: 'dateDebut' },
  { title: 'Fin', key: 'dateFin' },
  { title: 'Statut', key: 'statut' },
];

const items = ref<CycleSterilisation[]>([]);
const chargement = ref(false);
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const modalOuvert = ref(false);
const enregistrement = ref(false);
const formulaire = reactive({ materiel: '', numeroLot: '' });

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const resultat = await sterilisationService.findAll(pagination.page, pagination.limit);
    items.value = resultat.items;
    pagination.total = resultat.total;
  } finally {
    chargement.value = false;
  }
}

function changerPage(page: number): void {
  pagination.page = page;
  void charger();
}

function ouvrirCreation(): void {
  formulaire.materiel = '';
  formulaire.numeroLot = '';
  modalOuvert.value = true;
}

async function soumettre(): Promise<void> {
  enregistrement.value = true;
  try {
    await sterilisationService.create({ materiel: formulaire.materiel, numeroLot: formulaire.numeroLot });
    message.success('Cycle de stérilisation démarré.');
    modalOuvert.value = false;
    await charger();
  } finally {
    enregistrement.value = false;
  }
}

async function changerStatut(cycle: CycleSterilisation, statut: CycleSterilisationStatut): Promise<void> {
  await sterilisationService.update(cycle.id, statut);
  message.success('Statut mis à jour.');
  await charger();
}

onMounted(charger);
</script>

<template>
  <div>
    <div class="entete">
      <h2>Stérilisation</h2>
      <a-button type="primary" @click="ouvrirCreation">Démarrer un cycle</a-button>
    </div>

    <a-table
      :columns="colonnes"
      :data-source="items"
      :loading="chargement"
      row-key="id"
      :pagination="{ current: pagination.page, pageSize: pagination.limit, total: pagination.total, onChange: changerPage }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'dateDebut'">{{ new Date(record.dateDebut).toLocaleString('fr-SN') }}</template>
        <template v-else-if="column.key === 'dateFin'">
          {{ record.dateFin ? new Date(record.dateFin).toLocaleString('fr-SN') : '—' }}
        </template>
        <template v-else-if="column.key === 'statut'">
          <a-select :value="record.statut" size="small" style="width: 130px" @change="(valeur: CycleSterilisationStatut) => changerStatut(record, valeur)">
            <a-select-option v-for="statut in Object.values(CycleSterilisationStatut)" :key="statut" :value="statut">
              <a-tag :color="COULEUR_STATUT[statut]">{{ LIBELLE_STATUT[statut] }}</a-tag>
            </a-select-option>
          </a-select>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="modalOuvert" title="Démarrer un cycle de stérilisation" :confirm-loading="enregistrement" @ok="soumettre">
      <a-form layout="vertical">
        <a-form-item label="Matériel">
          <a-input v-model:value="formulaire.materiel" placeholder="Plateau chirurgical A" />
        </a-form-item>
        <a-form-item label="N° de lot">
          <a-input v-model:value="formulaire.numeroLot" placeholder="LOT-2026-001" />
        </a-form-item>
      </a-form>
    </a-modal>
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
