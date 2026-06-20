<script setup lang="ts">
import { RendezVousStatut } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as patientsService from '../../services/patients.service';
import type { Patient } from '../../services/patients.service';
import * as rendezVousService from '../../services/rendez-vous.service';
import type { RendezVous } from '../../services/rendez-vous.service';
import * as usersService from '../../services/users.service';
import type { Praticien } from '../../services/users.service';

const router = useRouter();

const LIBELLE_STATUT: Record<RendezVousStatut, string> = {
  [RendezVousStatut.PLANIFIE]: 'Planifié',
  [RendezVousStatut.CONFIRME]: 'Confirmé',
  [RendezVousStatut.TERMINE]: 'Terminé',
  [RendezVousStatut.ANNULE]: 'Annulé',
  [RendezVousStatut.NO_SHOW]: 'Absence (no-show)',
};

const COULEUR_STATUT: Record<RendezVousStatut, string> = {
  [RendezVousStatut.PLANIFIE]: 'blue',
  [RendezVousStatut.CONFIRME]: 'cyan',
  [RendezVousStatut.TERMINE]: 'green',
  [RendezVousStatut.ANNULE]: 'default',
  [RendezVousStatut.NO_SHOW]: 'red',
};

const colonnes = [
  { title: 'Date / heure', key: 'dateHeure' },
  { title: 'Patient', key: 'patient' },
  { title: 'Praticien', key: 'praticien' },
  { title: 'Motif', dataIndex: 'motif', key: 'motif' },
  { title: 'Statut', key: 'statut' },
];

const items = ref<RendezVous[]>([]);
const chargement = ref(false);
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const filtreStatut = ref<RendezVousStatut | undefined>(undefined);

const praticiens = ref<Praticien[]>([]);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const resultat = await rendezVousService.findAll(pagination.page, pagination.limit, { statut: filtreStatut.value });
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

function nomPraticien(praticienId: string): string {
  const praticien = praticiens.value.find((p) => p.id === praticienId);
  return praticien ? `${praticien.prenom} ${praticien.nom}` : praticienId;
}

// --- Création ---
const modalOuvert = ref(false);
const etapeRecherchePatient = ref(true);
const idhRecherche = ref('');
const rechercheEnCours = ref(false);
const patientSelectionne = ref<Patient | null>(null);
const enregistrement = ref(false);
const formulaire = reactive({ praticienId: undefined as string | undefined, dateHeure: '', dureeMin: 30, motif: '' });

function ouvrirCreation(): void {
  etapeRecherchePatient.value = true;
  idhRecherche.value = '';
  patientSelectionne.value = null;
  formulaire.praticienId = undefined;
  formulaire.dateHeure = '';
  formulaire.dureeMin = 30;
  formulaire.motif = '';
  modalOuvert.value = true;
}

async function rechercherPatient(): Promise<void> {
  if (!idhRecherche.value.trim()) return;
  rechercheEnCours.value = true;
  try {
    patientSelectionne.value = await patientsService.rechercherParIdh(idhRecherche.value.trim());
    etapeRecherchePatient.value = false;
  } catch {
    message.error('Aucun patient ne correspond à cet IDH.');
  } finally {
    rechercheEnCours.value = false;
  }
}

async function soumettre(): Promise<void> {
  if (!patientSelectionne.value || !formulaire.praticienId) return;
  enregistrement.value = true;
  try {
    await rendezVousService.create({
      patientId: patientSelectionne.value.id,
      praticienId: formulaire.praticienId,
      dateHeure: formulaire.dateHeure,
      dureeMin: formulaire.dureeMin,
      motif: formulaire.motif || undefined,
    });
    message.success('Rendez-vous créé.');
    modalOuvert.value = false;
    await charger();
  } finally {
    enregistrement.value = false;
  }
}

async function changerStatut(rdv: RendezVous, statut: RendezVousStatut): Promise<void> {
  await rendezVousService.changerStatut(rdv.id, statut);
  message.success('Statut mis à jour.');
  await charger();
}

function voirPatient(patientId: string): void {
  void router.push({ name: 'etablissement-patient-detail', params: { id: patientId } });
}

onMounted(async () => {
  praticiens.value = await usersService.findPraticiens();
  await charger();
});
</script>

<template>
  <div>
    <div class="entete">
      <h2>Rendez-vous</h2>
      <a-space>
        <a-select v-model:value="filtreStatut" placeholder="Filtrer par statut" allow-clear style="width: 200px" @change="onChangementFiltre">
          <a-select-option v-for="statut in Object.values(RendezVousStatut)" :key="statut" :value="statut">
            {{ LIBELLE_STATUT[statut] }}
          </a-select-option>
        </a-select>
        <a-button type="primary" @click="ouvrirCreation">Nouveau rendez-vous</a-button>
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
        <template v-if="column.key === 'dateHeure'">{{ new Date(record.dateHeure).toLocaleString('fr-SN') }}</template>
        <template v-else-if="column.key === 'patient'">
          <a @click="voirPatient(record.patientId)">{{ record.patientId.slice(0, 8) }}…</a>
        </template>
        <template v-else-if="column.key === 'praticien'">{{ nomPraticien(record.praticienId) }}</template>
        <template v-else-if="column.key === 'statut'">
          <a-select :value="record.statut" size="small" style="width: 160px" @change="(valeur: RendezVousStatut) => changerStatut(record, valeur)">
            <a-select-option v-for="statut in Object.values(RendezVousStatut)" :key="statut" :value="statut">
              <a-tag :color="COULEUR_STATUT[statut]">{{ LIBELLE_STATUT[statut] }}</a-tag>
            </a-select-option>
          </a-select>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="modalOuvert" title="Nouveau rendez-vous" :footer="etapeRecherchePatient ? null : undefined" :confirm-loading="enregistrement" @ok="soumettre">
      <template v-if="etapeRecherchePatient">
        <a-input-search
          v-model:value="idhRecherche"
          placeholder="Rechercher le patient par IDH"
          enter-button="Rechercher"
          :loading="rechercheEnCours"
          @search="rechercherPatient"
        />
      </template>
      <template v-else-if="patientSelectionne">
        <a-alert
          :message="`Patient : ${patientSelectionne.prenom} ${patientSelectionne.nom} (${patientSelectionne.idh})`"
          type="info"
          show-icon
          style="margin-bottom: 16px"
        />
        <a-form layout="vertical">
          <a-form-item label="Praticien">
            <a-select v-model:value="formulaire.praticienId" placeholder="Choisir un praticien">
              <a-select-option v-for="praticien in praticiens" :key="praticien.id" :value="praticien.id">
                {{ praticien.prenom }} {{ praticien.nom }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="Date et heure">
            <a-input v-model:value="formulaire.dateHeure" type="datetime-local" />
          </a-form-item>
          <a-form-item label="Durée (minutes)">
            <a-input-number v-model:value="formulaire.dureeMin" :min="5" />
          </a-form-item>
          <a-form-item label="Motif">
            <a-input v-model:value="formulaire.motif" />
          </a-form-item>
        </a-form>
      </template>
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
