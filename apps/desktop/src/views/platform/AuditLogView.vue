<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import * as auditService from '../../services/audit.service';
import type { AuditLog } from '../../services/audit.service';
import * as etablissementsService from '../../services/etablissements.service';
import type { Etablissement } from '../../services/etablissements.service';

const colonnes = [
  { title: 'Date', key: 'createdAt' },
  { title: 'Action', dataIndex: 'action', key: 'action' },
  { title: 'Ressource', key: 'ressource' },
  { title: 'Établissement', key: 'etablissement' },
  { title: 'Utilisateur', key: 'userId' },
  { title: 'IP', dataIndex: 'ip', key: 'ip' },
];

const items = ref<AuditLog[]>([]);
const etablissements = ref<Etablissement[]>([]);
const chargement = ref(false);
const filtreEtablissementId = ref<string | undefined>(undefined);

const pagination = reactive({ current: 1, pageSize: 20, total: 0 });

const nomEtablissementParId = computed<Record<string, string>>(() =>
  Object.fromEntries(etablissements.value.map((etablissement) => [etablissement.id, etablissement.nom])),
);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const resultat = await auditService.findAll(pagination.current, pagination.pageSize, filtreEtablissementId.value);
    items.value = resultat.items;
    pagination.total = resultat.total;
  } finally {
    chargement.value = false;
  }
}

function onChangementPagination(page: { current?: number; pageSize?: number }): void {
  pagination.current = page.current ?? 1;
  pagination.pageSize = page.pageSize ?? 20;
  void charger();
}

function onChangementFiltre(): void {
  pagination.current = 1;
  void charger();
}

onMounted(async () => {
  // Liste des établissements chargée une fois pour alimenter le filtre et résoudre les noms affichés.
  const resultatEtablissements = await etablissementsService.findAll(1, 100);
  etablissements.value = resultatEtablissements.items;
  await charger();
});
</script>

<template>
  <div>
    <div class="entete">
      <h2>Journal d’audit</h2>
      <a-select
        v-model:value="filtreEtablissementId"
        placeholder="Filtrer par établissement"
        allow-clear
        style="width: 280px"
        show-search
        option-filter-prop="label"
        @change="onChangementFiltre"
      >
        <a-select-option v-for="etablissement in etablissements" :key="etablissement.id" :value="etablissement.id" :label="etablissement.nom">
          {{ etablissement.nom }}
        </a-select-option>
      </a-select>
    </div>

    <a-table
      :columns="colonnes"
      :data-source="items"
      :loading="chargement"
      :pagination="pagination"
      row-key="id"
      @change="onChangementPagination"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'createdAt'">{{ new Date(record.createdAt).toLocaleString('fr-SN') }}</template>
        <template v-else-if="column.key === 'ressource'">{{ record.ressource ?? '—' }} {{ record.ressourceId ? `(${record.ressourceId.slice(0, 8)}…)` : '' }}</template>
        <template v-else-if="column.key === 'etablissement'">
          {{ record.etablissementId ? nomEtablissementParId[record.etablissementId] ?? record.etablissementId : 'Plateforme' }}
        </template>
        <template v-else-if="column.key === 'userId'">{{ record.userId ? `${record.userId.slice(0, 8)}…` : '—' }}</template>
      </template>
    </a-table>
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
