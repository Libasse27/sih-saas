<script setup lang="ts">
import { Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as apiKeysService from '../../services/api-keys.service';
import type { ApiKey } from '../../services/api-keys.service';

const colonnes = [
  { title: 'Nom', dataIndex: 'nom', key: 'nom' },
  { title: 'Préfixe', dataIndex: 'prefixe', key: 'prefixe' },
  { title: 'Expiration', key: 'expirationDate' },
  { title: 'Dernière utilisation', key: 'derniereUtilisation' },
  { title: 'Statut', key: 'actif' },
  { title: 'Actions', key: 'actions' },
];

const items = ref<ApiKey[]>([]);
const chargement = ref(false);

const modalCreationOuvert = ref(false);
const enregistrement = ref(false);
const formulaire = reactive({ nom: '', expirationDate: '' });

const cleGeneree = ref<string | null>(null);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    items.value = await apiKeysService.findAll();
  } finally {
    chargement.value = false;
  }
}

function ouvrirCreation(): void {
  formulaire.nom = '';
  formulaire.expirationDate = '';
  modalCreationOuvert.value = true;
}

async function soumettre(): Promise<void> {
  enregistrement.value = true;
  try {
    const resultat = await apiKeysService.create({
      nom: formulaire.nom,
      permissions: [Permission.FHIR_READ],
      expirationDate: formulaire.expirationDate || undefined,
    });
    modalCreationOuvert.value = false;
    cleGeneree.value = resultat.cle;
    await charger();
  } finally {
    enregistrement.value = false;
  }
}

async function revoquer(cle: ApiKey): Promise<void> {
  await apiKeysService.revoquer(cle.id);
  message.success('Clé API révoquée.');
  await charger();
}

onMounted(charger);
</script>

<template>
  <div>
    <div class="entete">
      <h2>Clés API</h2>
      <a-button type="primary" @click="ouvrirCreation">Nouvelle clé</a-button>
    </div>

    <a-alert
      type="info"
      show-icon
      message="Les clés API donnent un accès en lecture seule à l'export FHIR R4 (Patient, Encounter, Observation, etc.) pour un système externe — jamais à un compte humain."
      style="margin-bottom: 16px"
    />

    <a-table :columns="colonnes" :data-source="items" :loading="chargement" row-key="id" :pagination="false">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'expirationDate'">
          {{ record.expirationDate ? new Date(record.expirationDate).toLocaleDateString('fr-SN') : 'Jamais' }}
        </template>
        <template v-else-if="column.key === 'derniereUtilisation'">
          {{ record.derniereUtilisation ? new Date(record.derniereUtilisation).toLocaleString('fr-SN') : 'Jamais utilisée' }}
        </template>
        <template v-else-if="column.key === 'actif'">
          <a-tag :color="record.actif ? 'green' : 'default'">{{ record.actif ? 'Active' : 'Révoquée' }}</a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-popconfirm
            v-if="record.actif"
            title="Révoquer cette clé ? Toute intégration l'utilisant cessera de fonctionner immédiatement."
            @confirm="revoquer(record)"
          >
            <a-button size="small" danger>Révoquer</a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="modalCreationOuvert" title="Nouvelle clé API" :confirm-loading="enregistrement" @ok="soumettre">
      <a-form layout="vertical">
        <a-form-item label="Nom (usage prévu)">
          <a-input v-model:value="formulaire.nom" placeholder="Intégration dossier patient national" />
        </a-form-item>
        <a-form-item label="Expiration (optionnel)">
          <a-input v-model:value="formulaire.expirationDate" type="date" />
        </a-form-item>
        <a-checkbox checked disabled>Lecture FHIR (fhir:read) — seule permission disponible pour une clé API</a-checkbox>
      </a-form>
    </a-modal>

    <a-modal :open="!!cleGeneree" title="Clé API créée" :footer="null" @cancel="cleGeneree = null">
      <a-alert type="warning" show-icon message="Notez cette clé maintenant — elle ne sera plus jamais affichée." style="margin-bottom: 16px" />
      <a-typography-paragraph copyable>{{ cleGeneree }}</a-typography-paragraph>
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
