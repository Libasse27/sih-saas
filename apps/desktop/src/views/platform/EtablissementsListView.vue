<script setup lang="ts">
import { EtablissementStatut } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as etablissementsService from '../../services/etablissements.service';
import type { Etablissement } from '../../services/etablissements.service';

const router = useRouter();

const LIBELLE_STATUT: Record<EtablissementStatut, string> = {
  [EtablissementStatut.ACTIF]: 'Actif',
  [EtablissementStatut.SUSPENDU]: 'Suspendu',
  [EtablissementStatut.EXPIRE]: 'Expiré',
  [EtablissementStatut.EN_ATTENTE_PAIEMENT]: 'En attente de paiement',
  [EtablissementStatut.ESSAI]: 'À l’essai',
};

const COULEUR_STATUT: Record<EtablissementStatut, string> = {
  [EtablissementStatut.ACTIF]: 'green',
  [EtablissementStatut.SUSPENDU]: 'red',
  [EtablissementStatut.EXPIRE]: 'default',
  [EtablissementStatut.EN_ATTENTE_PAIEMENT]: 'orange',
  [EtablissementStatut.ESSAI]: 'blue',
};

const colonnes = [
  { title: 'Code', dataIndex: 'code', key: 'code' },
  { title: 'Nom', dataIndex: 'nom', key: 'nom' },
  { title: 'Type', dataIndex: 'type', key: 'type' },
  { title: 'Statut', key: 'statut' },
  { title: 'Utilisateurs', key: 'utilisateurs' },
  { title: 'Lits', key: 'lits' },
  { title: 'Créé le', key: 'createdAt' },
  { title: 'Actions', key: 'actions' },
];

const items = ref<Etablissement[]>([]);
const chargement = ref(false);
const filtreStatut = ref<EtablissementStatut | undefined>(undefined);

const pagination = reactive({ current: 1, pageSize: 20, total: 0 });

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const resultat = await etablissementsService.findAll(pagination.current, pagination.pageSize, filtreStatut.value);
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

function voirDetail(id: string): void {
  void router.push({ name: 'platform-etablissement-detail', params: { id } });
}

async function basculerStatut(etablissement: Etablissement): Promise<void> {
  const nouveauStatut =
    etablissement.statut === EtablissementStatut.SUSPENDU ? EtablissementStatut.ACTIF : EtablissementStatut.SUSPENDU;
  await etablissementsService.updateStatut(etablissement.id, nouveauStatut);
  message.success(`Établissement ${LIBELLE_STATUT[nouveauStatut].toLowerCase()}.`);
  await charger();
}

onMounted(charger);
</script>

<template>
  <div>
    <div class="entete">
      <h2>Établissements</h2>
      <a-select
        v-model:value="filtreStatut"
        placeholder="Filtrer par statut"
        allow-clear
        style="width: 240px"
        @change="onChangementFiltre"
      >
        <a-select-option v-for="statut in Object.values(EtablissementStatut)" :key="statut" :value="statut">
          {{ LIBELLE_STATUT[statut] }}
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
        <template v-if="column.key === 'statut'">
          <a-tag :color="COULEUR_STATUT[record.statut as EtablissementStatut]">
            {{ LIBELLE_STATUT[record.statut as EtablissementStatut] }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'utilisateurs'">{{ record.usage.utilisateurs }}</template>
        <template v-else-if="column.key === 'lits'">{{ record.usage.lits }}</template>
        <template v-else-if="column.key === 'createdAt'">{{ new Date(record.createdAt).toLocaleDateString('fr-SN') }}</template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button size="small" @click="voirDetail(record.id)">Voir</a-button>
            <a-popconfirm
              :title="record.statut === EtablissementStatut.SUSPENDU ? 'Réactiver cet établissement ?' : 'Suspendre cet établissement ?'"
              @confirm="basculerStatut(record)"
            >
              <a-button size="small" :danger="record.statut !== EtablissementStatut.SUSPENDU">
                {{ record.statut === EtablissementStatut.SUSPENDU ? 'Réactiver' : 'Suspendre' }}
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
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
