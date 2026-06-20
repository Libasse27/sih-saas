<script setup lang="ts">
import { AdmissionStatut, LitStatut } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as admissionsLitsService from '../../services/admissions-lits.service';
import type { Admission, Lit, ServiceClinique } from '../../services/admissions-lits.service';
import * as patientsService from '../../services/patients.service';
import type { Patient } from '../../services/patients.service';
import * as usersService from '../../services/users.service';
import type { Praticien } from '../../services/users.service';

const router = useRouter();

const LIBELLE_STATUT: Record<AdmissionStatut, string> = {
  [AdmissionStatut.EN_COURS]: 'En cours',
  [AdmissionStatut.TERMINEE]: 'Terminée',
  [AdmissionStatut.ANNULEE]: 'Annulée',
};

const COULEUR_STATUT: Record<AdmissionStatut, string> = {
  [AdmissionStatut.EN_COURS]: 'blue',
  [AdmissionStatut.TERMINEE]: 'green',
  [AdmissionStatut.ANNULEE]: 'default',
};

const colonnes = [
  { title: 'Patient', key: 'patient' },
  { title: 'Motif', dataIndex: 'motif', key: 'motif' },
  { title: 'Admis le', key: 'dateAdmission' },
  { title: 'Statut', key: 'statut' },
  { title: 'Actions', key: 'actions' },
];

const items = ref<Admission[]>([]);
const chargement = ref(false);
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const filtreStatut = ref<AdmissionStatut | undefined>(undefined);

const services = ref<ServiceClinique[]>([]);
const praticiens = ref<Praticien[]>([]);
const litsLibres = ref<Lit[]>([]);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const resultat = await admissionsLitsService.findAdmissions(pagination.page, pagination.limit, { statut: filtreStatut.value });
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

function voirPatient(patientId: string): void {
  void router.push({ name: 'etablissement-patient-detail', params: { id: patientId } });
}

// --- Création ---
const modalOuvert = ref(false);
const etapeRecherchePatient = ref(true);
const idhRecherche = ref('');
const rechercheEnCours = ref(false);
const patientSelectionne = ref<Patient | null>(null);
const enregistrement = ref(false);
const formulaire = reactive({
  serviceId: undefined as string | undefined,
  litId: undefined as string | undefined,
  medecinReferentId: undefined as string | undefined,
  motif: '',
});

function ouvrirCreation(): void {
  etapeRecherchePatient.value = true;
  idhRecherche.value = '';
  patientSelectionne.value = null;
  formulaire.serviceId = undefined;
  formulaire.litId = undefined;
  formulaire.medecinReferentId = undefined;
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

async function onChangementService(): Promise<void> {
  formulaire.litId = undefined;
  if (!formulaire.serviceId) {
    litsLibres.value = [];
    return;
  }
  const resultat = await admissionsLitsService.findLits(1, 100, { serviceId: formulaire.serviceId, statut: LitStatut.LIBRE });
  litsLibres.value = resultat.items;
}

async function soumettre(): Promise<void> {
  if (!patientSelectionne.value || !formulaire.serviceId || !formulaire.medecinReferentId) return;
  enregistrement.value = true;
  try {
    await admissionsLitsService.createAdmission({
      patientId: patientSelectionne.value.id,
      serviceId: formulaire.serviceId,
      litId: formulaire.litId,
      medecinReferentId: formulaire.medecinReferentId,
      motif: formulaire.motif,
    });
    message.success('Admission enregistrée.');
    modalOuvert.value = false;
    await charger();
  } finally {
    enregistrement.value = false;
  }
}

async function sortie(admission: Admission): Promise<void> {
  await admissionsLitsService.sortieAdmission(admission.id);
  message.success('Sortie enregistrée, lit libéré.');
  await charger();
}

onMounted(async () => {
  const [resultatServices, resultatPraticiens] = await Promise.all([
    admissionsLitsService.findServices(1, 100),
    usersService.findPraticiens(),
  ]);
  services.value = resultatServices.items;
  praticiens.value = resultatPraticiens;
  await charger();
});
</script>

<template>
  <div>
    <div class="entete">
      <h2>Admissions</h2>
      <a-space>
        <a-select v-model:value="filtreStatut" placeholder="Filtrer par statut" allow-clear style="width: 200px" @change="onChangementFiltre">
          <a-select-option v-for="statut in Object.values(AdmissionStatut)" :key="statut" :value="statut">
            {{ LIBELLE_STATUT[statut] }}
          </a-select-option>
        </a-select>
        <a-button type="primary" @click="ouvrirCreation">Nouvelle admission</a-button>
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
        <template v-if="column.key === 'patient'">
          <a @click="voirPatient(record.patientId)">{{ record.patientId.slice(0, 8) }}…</a>
        </template>
        <template v-else-if="column.key === 'dateAdmission'">{{ new Date(record.dateAdmission).toLocaleString('fr-SN') }}</template>
        <template v-else-if="column.key === 'statut'">
          <a-tag :color="COULEUR_STATUT[record.statut as AdmissionStatut]">{{ LIBELLE_STATUT[record.statut as AdmissionStatut] }}</a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-popconfirm v-if="record.statut === AdmissionStatut.EN_COURS" title="Enregistrer la sortie de ce patient ?" @confirm="sortie(record)">
            <a-button size="small">Sortie</a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="modalOuvert" title="Nouvelle admission" :footer="etapeRecherchePatient ? null : undefined" :confirm-loading="enregistrement" @ok="soumettre">
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
          <a-form-item label="Service">
            <a-select v-model:value="formulaire.serviceId" @change="onChangementService">
              <a-select-option v-for="service in services" :key="service.id" :value="service.id">{{ service.nom }}</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="Lit (optionnel — assigné plus tard si vide)">
            <a-select v-model:value="formulaire.litId" allow-clear :disabled="!formulaire.serviceId">
              <a-select-option v-for="lit in litsLibres" :key="lit.id" :value="lit.id">Lit {{ lit.numero }}</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="Médecin référent">
            <a-select v-model:value="formulaire.medecinReferentId">
              <a-select-option v-for="praticien in praticiens" :key="praticien.id" :value="praticien.id">
                {{ praticien.prenom }} {{ praticien.nom }}
              </a-select-option>
            </a-select>
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
