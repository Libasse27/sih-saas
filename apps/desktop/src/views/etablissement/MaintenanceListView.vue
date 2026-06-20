<script setup lang="ts">
import { DemandeMaintenanceStatut } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as maintenanceService from '../../services/maintenance.service';
import type { DemandeMaintenance } from '../../services/maintenance.service';

const LIBELLE_STATUT: Record<DemandeMaintenanceStatut, string> = {
  [DemandeMaintenanceStatut.SIGNALEE]: 'Signalée',
  [DemandeMaintenanceStatut.EN_COURS]: 'En cours',
  [DemandeMaintenanceStatut.RESOLUE]: 'Résolue',
  [DemandeMaintenanceStatut.ANNULEE]: 'Annulée',
};

const COULEUR_STATUT: Record<DemandeMaintenanceStatut, string> = {
  [DemandeMaintenanceStatut.SIGNALEE]: 'orange',
  [DemandeMaintenanceStatut.EN_COURS]: 'blue',
  [DemandeMaintenanceStatut.RESOLUE]: 'green',
  [DemandeMaintenanceStatut.ANNULEE]: 'default',
};

const colonnes = [
  { title: 'Équipement', dataIndex: 'equipement', key: 'equipement' },
  { title: 'Localisation', dataIndex: 'localisation', key: 'localisation' },
  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Signalée le', key: 'dateSignalement' },
  { title: 'Statut', key: 'statut' },
];

const items = ref<DemandeMaintenance[]>([]);
const chargement = ref(false);
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const modalOuvert = ref(false);
const enregistrement = ref(false);
const formulaire = reactive({ equipement: '', localisation: '', description: '' });

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const resultat = await maintenanceService.findAll(pagination.page, pagination.limit);
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
  formulaire.equipement = '';
  formulaire.localisation = '';
  formulaire.description = '';
  modalOuvert.value = true;
}

async function soumettre(): Promise<void> {
  enregistrement.value = true;
  try {
    await maintenanceService.create({
      equipement: formulaire.equipement,
      localisation: formulaire.localisation || undefined,
      description: formulaire.description,
    });
    message.success('Demande de maintenance signalée.');
    modalOuvert.value = false;
    await charger();
  } finally {
    enregistrement.value = false;
  }
}

async function changerStatut(demande: DemandeMaintenance, statut: DemandeMaintenanceStatut): Promise<void> {
  await maintenanceService.update(demande.id, { statut });
  message.success('Statut mis à jour.');
  await charger();
}

onMounted(charger);
</script>

<template>
  <div>
    <div class="entete">
      <h2>Maintenance</h2>
      <a-button type="primary" @click="ouvrirCreation">Signaler une demande</a-button>
    </div>

    <a-table
      :columns="colonnes"
      :data-source="items"
      :loading="chargement"
      row-key="id"
      :pagination="{ current: pagination.page, pageSize: pagination.limit, total: pagination.total, onChange: changerPage }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'dateSignalement'">
          {{ new Date(record.dateSignalement).toLocaleDateString('fr-SN') }}
        </template>
        <template v-else-if="column.key === 'statut'">
          <a-select :value="record.statut" size="small" style="width: 140px" @change="(valeur: DemandeMaintenanceStatut) => changerStatut(record, valeur)">
            <a-select-option v-for="statut in Object.values(DemandeMaintenanceStatut)" :key="statut" :value="statut">
              <a-tag :color="COULEUR_STATUT[statut]">{{ LIBELLE_STATUT[statut] }}</a-tag>
            </a-select-option>
          </a-select>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="modalOuvert" title="Signaler une demande de maintenance" :confirm-loading="enregistrement" @ok="soumettre">
      <a-form layout="vertical">
        <a-form-item label="Équipement">
          <a-input v-model:value="formulaire.equipement" placeholder="Climatiseur bloc B" />
        </a-form-item>
        <a-form-item label="Localisation">
          <a-input v-model:value="formulaire.localisation" placeholder="Bâtiment B, 2e étage" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="formulaire.description" :rows="3" />
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
