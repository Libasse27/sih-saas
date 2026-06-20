<script setup lang="ts">
import { Sexe } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as patientsService from '../../services/patients.service';
import type { Patient } from '../../services/patients.service';

const router = useRouter();

const colonnes = [
  { title: 'IDH', dataIndex: 'idh', key: 'idh' },
  { title: 'Nom', key: 'nom' },
  { title: 'Date de naissance', key: 'dateNaissance' },
  { title: 'Sexe', key: 'sexe' },
  { title: 'Téléphone', dataIndex: 'telephone', key: 'telephone' },
  { title: 'Actions', key: 'actions' },
];

const items = ref<Patient[]>([]);
const chargement = ref(false);
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const idhRecherche = ref('');
const rechercheEnCours = ref(false);
const nomRecherche = ref('');

const modalOuvert = ref(false);
const enregistrement = ref(false);
const formulaire = reactive({
  nom: '',
  prenom: '',
  dateNaissance: '',
  sexe: Sexe.M,
  telephone: '',
  adresse: '',
});

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const resultat = await patientsService.findAll(pagination.page, pagination.limit, nomRecherche.value.trim() || undefined);
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

function onRechercheNom(): void {
  pagination.page = 1;
  void charger();
}

function voirDetail(id: string): void {
  void router.push({ name: 'etablissement-patient-detail', params: { id } });
}

async function rechercherParIdh(): Promise<void> {
  if (!idhRecherche.value.trim()) return;
  rechercheEnCours.value = true;
  try {
    const patient = await patientsService.rechercherParIdh(idhRecherche.value.trim());
    voirDetail(patient.id);
  } catch {
    message.error('Aucun patient ne correspond à cet IDH.');
  } finally {
    rechercheEnCours.value = false;
  }
}

function ouvrirCreation(): void {
  formulaire.nom = '';
  formulaire.prenom = '';
  formulaire.dateNaissance = '';
  formulaire.sexe = Sexe.M;
  formulaire.telephone = '';
  formulaire.adresse = '';
  modalOuvert.value = true;
}

async function soumettre(): Promise<void> {
  enregistrement.value = true;
  try {
    const patient = await patientsService.create({
      nom: formulaire.nom,
      prenom: formulaire.prenom,
      dateNaissance: formulaire.dateNaissance,
      sexe: formulaire.sexe,
      telephone: formulaire.telephone || undefined,
      adresse: formulaire.adresse || undefined,
    });
    message.success(`Patient créé — IDH ${patient.idh}.`);
    modalOuvert.value = false;
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
      <h2>Patients</h2>
      <a-space>
        <a-input-search
          v-model:value="nomRecherche"
          placeholder="Rechercher par nom ou prénom"
          allow-clear
          style="width: 260px"
          @search="onRechercheNom"
        />
        <a-input-search
          v-model:value="idhRecherche"
          placeholder="Aller directement à un IDH"
          enter-button="Rechercher"
          :loading="rechercheEnCours"
          style="width: 320px"
          @search="rechercherParIdh"
        />
        <a-button type="primary" @click="ouvrirCreation">Nouveau patient</a-button>
      </a-space>
    </div>

    <a-table
      :columns="colonnes"
      :data-source="items"
      :loading="chargement"
      row-key="id"
      :pagination="{ current: pagination.page, pageSize: pagination.limit, total: pagination.total, onChange: changerPage }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'nom'">{{ record.prenom }} {{ record.nom }}</template>
        <template v-else-if="column.key === 'dateNaissance'">{{ new Date(record.dateNaissance).toLocaleDateString('fr-SN') }}</template>
        <template v-else-if="column.key === 'sexe'">{{ record.sexe === Sexe.M ? 'Masculin' : 'Féminin' }}</template>
        <template v-else-if="column.key === 'actions'">
          <a-button size="small" @click="voirDetail(record.id)">Ouvrir le dossier</a-button>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="modalOuvert" title="Nouveau patient" :confirm-loading="enregistrement" @ok="soumettre">
      <a-form layout="vertical">
        <a-space>
          <a-form-item label="Nom"><a-input v-model:value="formulaire.nom" /></a-form-item>
          <a-form-item label="Prénom"><a-input v-model:value="formulaire.prenom" /></a-form-item>
        </a-space>
        <a-space>
          <a-form-item label="Date de naissance"><a-input v-model:value="formulaire.dateNaissance" type="date" /></a-form-item>
          <a-form-item label="Sexe">
            <a-select v-model:value="formulaire.sexe" style="width: 140px">
              <a-select-option :value="Sexe.M">Masculin</a-select-option>
              <a-select-option :value="Sexe.F">Féminin</a-select-option>
            </a-select>
          </a-form-item>
        </a-space>
        <a-form-item label="Téléphone"><a-input v-model:value="formulaire.telephone" placeholder="+221XXXXXXXXX" /></a-form-item>
        <a-form-item label="Adresse"><a-input v-model:value="formulaire.adresse" /></a-form-item>
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
