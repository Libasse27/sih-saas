<script setup lang="ts">
import { StatutCreanceAssurance } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as creancesService from '../../services/creances-assurance.service';
import type { CreanceAssurance } from '../../services/creances-assurance.service';

const LIBELLE_STATUT: Record<StatutCreanceAssurance, string> = {
  [StatutCreanceAssurance.A_SOUMETTRE]: 'À soumettre',
  [StatutCreanceAssurance.SOUMISE]: 'Soumise',
  [StatutCreanceAssurance.PAYEE]: 'Payée',
  [StatutCreanceAssurance.REJETEE]: 'Rejetée',
};

const COULEUR_STATUT: Record<StatutCreanceAssurance, string> = {
  [StatutCreanceAssurance.A_SOUMETTRE]: 'orange',
  [StatutCreanceAssurance.SOUMISE]: 'blue',
  [StatutCreanceAssurance.PAYEE]: 'green',
  [StatutCreanceAssurance.REJETEE]: 'red',
};

const items = ref<CreanceAssurance[]>([]);
const chargement = ref(false);
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const filtreStatut = ref<StatutCreanceAssurance | undefined>(undefined);

const modaleOuverte = ref(false);
const modaleAction = ref<'payee' | 'rejetee' | null>(null);
const creanceEnEdition = ref<CreanceAssurance | null>(null);
const valeurSaisie = ref('');
const enregistrement = ref(false);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const resultat = await creancesService.findAll(pagination.page, pagination.limit, filtreStatut.value);
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

function onChangementFiltre(): void {
  pagination.page = 1;
  void charger();
}

async function soumettre(creance: CreanceAssurance): Promise<void> {
  await creancesService.soumettre(creance.id);
  message.success('Créance soumise à l’assureur.');
  await charger();
}

function ouvrirMarquerPayee(creance: CreanceAssurance): void {
  creanceEnEdition.value = creance;
  modaleAction.value = 'payee';
  valeurSaisie.value = '';
  modaleOuverte.value = true;
}

function ouvrirMarquerRejetee(creance: CreanceAssurance): void {
  creanceEnEdition.value = creance;
  modaleAction.value = 'rejetee';
  valeurSaisie.value = '';
  modaleOuverte.value = true;
}

async function confirmerModale(): Promise<void> {
  if (!creanceEnEdition.value || !modaleAction.value) return;
  enregistrement.value = true;
  try {
    if (modaleAction.value === 'payee') {
      await creancesService.marquerPayee(creanceEnEdition.value.id, valeurSaisie.value);
      message.success('Créance marquée payée.');
    } else {
      await creancesService.marquerRejetee(creanceEnEdition.value.id, valeurSaisie.value);
      message.success('Créance marquée rejetée.');
    }
    modaleOuverte.value = false;
    await charger();
  } finally {
    enregistrement.value = false;
  }
}

onMounted(charger);
</script>

<template>
  <div>
    <div class="entete">
      <h2>Créances assurance (tiers-payant)</h2>
      <a-select v-model:value="filtreStatut" placeholder="Filtrer par statut" allow-clear style="width: 220px" @change="onChangementFiltre">
        <a-select-option v-for="statut in Object.values(StatutCreanceAssurance)" :key="statut" :value="statut">
          {{ LIBELLE_STATUT[statut] }}
        </a-select-option>
      </a-select>
    </div>

    <a-alert
      type="info"
      show-icon
      message="Suivi interne — aucune API assureur n'existe au Sénégal (CMU/IPM/mutuelles) ; ce tableau remplace le suivi papier des créances, il n'encaisse rien automatiquement."
      style="margin-bottom: 16px"
    />

    <a-table
      :data-source="items"
      :loading="chargement"
      row-key="id"
      :pagination="{ current: pagination.page, pageSize: pagination.limit, total: pagination.total, onChange: changerPage }"
    >
      <a-table-column title="Facture">
        <template #default="{ record }">{{ record.facturePatientId.slice(0, 8) }}…</template>
      </a-table-column>
      <a-table-column title="Montant">
        <template #default="{ record }">{{ record.montant }} FCFA</template>
      </a-table-column>
      <a-table-column title="Statut">
        <template #default="{ record }">
          <a-tag :color="COULEUR_STATUT[record.statut as StatutCreanceAssurance]">{{ LIBELLE_STATUT[record.statut as StatutCreanceAssurance] }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column title="Soumise le">
        <template #default="{ record }">
          {{ record.dateSoumission ? new Date(record.dateSoumission).toLocaleDateString('fr-SN') : '—' }}
        </template>
      </a-table-column>
      <a-table-column title="Actions">
        <template #default="{ record }">
          <a-space>
            <a-button v-if="record.statut === StatutCreanceAssurance.A_SOUMETTRE" size="small" @click="soumettre(record)">
              Soumettre
            </a-button>
            <template v-if="record.statut === StatutCreanceAssurance.SOUMISE">
              <a-button size="small" @click="ouvrirMarquerPayee(record)">Marquer payée</a-button>
              <a-button size="small" danger @click="ouvrirMarquerRejetee(record)">Marquer rejetée</a-button>
            </template>
          </a-space>
        </template>
      </a-table-column>
    </a-table>

    <a-modal
      :open="modaleOuverte"
      :title="modaleAction === 'payee' ? 'Marquer la créance payée' : 'Marquer la créance rejetée'"
      :confirm-loading="enregistrement"
      @ok="confirmerModale"
      @cancel="modaleOuverte = false"
    >
      <a-form layout="vertical">
        <a-form-item :label="modaleAction === 'payee' ? 'Référence du règlement' : 'Motif du rejet'">
          <a-input v-model:value="valeurSaisie" />
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
