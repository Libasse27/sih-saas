<script setup lang="ts">
import { IssueUrgence, LitStatut, NiveauTriage, Permission, UrgenceStatut, AlerteUrgenceStatut } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import * as admissionsLitsService from '../../services/admissions-lits.service';
import type { Lit, ServiceClinique } from '../../services/admissions-lits.service';
import * as patientsService from '../../services/patients.service';
import type { Patient } from '../../services/patients.service';
import { obtenirSocket } from '../../services/realtime';
import { useAuthStore } from '../../stores/auth.store';
import * as urgencesService from '../../services/urgences.service';
import type { Urgence, UrgenceDetail } from '../../services/urgences.service';

const auth = useAuthStore();
const peutTrier = auth.aPermission(Permission.URGENCE_TRIAGE);
const peutPrendreEnCharge = auth.aPermission(Permission.URGENCE_PRISE_EN_CHARGE);
const peutSurveiller = auth.aPermission(Permission.URGENCE_SURVEILLANCE);
const peutAlerter = auth.aPermission(Permission.URGENCE_ALERTE);

const LIBELLE_NIVEAU: Record<NiveauTriage, string> = {
  [NiveauTriage.VITAL]: 'Vital',
  [NiveauTriage.TRES_URGENT]: 'Très urgent',
  [NiveauTriage.URGENT]: 'Urgent',
  [NiveauTriage.PEU_URGENT]: 'Peu urgent',
  [NiveauTriage.NON_URGENT]: 'Non urgent',
};
const COULEUR_NIVEAU: Record<NiveauTriage, string> = {
  [NiveauTriage.VITAL]: 'red',
  [NiveauTriage.TRES_URGENT]: 'orange',
  [NiveauTriage.URGENT]: 'gold',
  [NiveauTriage.PEU_URGENT]: 'blue',
  [NiveauTriage.NON_URGENT]: 'green',
};
const LIBELLE_STATUT: Record<UrgenceStatut, string> = {
  [UrgenceStatut.EN_ATTENTE]: 'En attente',
  [UrgenceStatut.EN_COURS]: 'En cours',
  [UrgenceStatut.TRANSFEREE]: 'Transférée',
  [UrgenceStatut.SORTIE]: 'Sortie',
  [UrgenceStatut.DECES]: 'Décès',
};
const COULEUR_STATUT: Record<UrgenceStatut, string> = {
  [UrgenceStatut.EN_ATTENTE]: 'default',
  [UrgenceStatut.EN_COURS]: 'processing',
  [UrgenceStatut.TRANSFEREE]: 'green',
  [UrgenceStatut.SORTIE]: 'green',
  [UrgenceStatut.DECES]: 'black',
};

const colonnes = [
  { title: 'Patient', key: 'patient' },
  { title: 'Motif', dataIndex: 'motif', key: 'motif' },
  { title: 'Triage', key: 'triage' },
  { title: 'Statut', key: 'statut' },
  { title: 'Arrivée', key: 'arrivee' },
  { title: 'Actions', key: 'actions' },
];

const items = ref<Urgence[]>([]);
const chargement = ref(false);
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const filtreStatut = ref<UrgenceStatut | undefined>(undefined);
const patientsCache = reactive<Record<string, Patient>>({});

async function resoudrePatient(patientId: string): Promise<void> {
  if (patientsCache[patientId]) return;
  try {
    patientsCache[patientId] = await patientsService.findById(patientId);
  } catch {
    // Affichage dégradé (id tronqué) si le patient n'a pas pu être résolu — pas bloquant.
  }
}

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const resultat = await urgencesService.findUrgences(pagination.page, pagination.limit, { statut: filtreStatut.value });
    items.value = resultat.items;
    pagination.total = resultat.total;
    await Promise.all(resultat.items.map((u) => resoudrePatient(u.patientId)));
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

function libellePatient(patientId: string): string {
  const patient = patientsCache[patientId];
  return patient ? `${patient.prenom} ${patient.nom} (${patient.idh})` : `${patientId.slice(0, 8)}…`;
}

function rendreNiveauTriageDeLigne({ record }: { record: { niveau: NiveauTriage } }): string {
  return LIBELLE_NIVEAU[record.niveau];
}

function rendreDateSurveillance({ record }: { record: { createdAt: string } }): string {
  return new Date(record.createdAt).toLocaleTimeString('fr-SN');
}

// --- Création ---
const modalCreationOuvert = ref(false);
const etapeRecherchePatient = ref(true);
const idhRecherche = ref('');
const rechercheEnCours = ref(false);
const patientSelectionne = ref<Patient | null>(null);
const enregistrementCreation = ref(false);
const formulaireCreation = reactive({ motif: '', niveauTriage: undefined as NiveauTriage | undefined });

function ouvrirCreation(): void {
  etapeRecherchePatient.value = true;
  idhRecherche.value = '';
  patientSelectionne.value = null;
  formulaireCreation.motif = '';
  formulaireCreation.niveauTriage = undefined;
  modalCreationOuvert.value = true;
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

async function soumettreCreation(): Promise<void> {
  if (!patientSelectionne.value || !formulaireCreation.niveauTriage) return;
  enregistrementCreation.value = true;
  try {
    await urgencesService.createUrgence({
      patientId: patientSelectionne.value.id,
      motif: formulaireCreation.motif,
      niveauTriage: formulaireCreation.niveauTriage,
    });
    message.success('Épisode aux urgences créé.');
    modalCreationOuvert.value = false;
    await charger();
  } finally {
    enregistrementCreation.value = false;
  }
}

// --- Détail ---
const modalDetailOuvert = ref(false);
const chargementDetail = ref(false);
const detailEnCours = ref<UrgenceDetail | null>(null);

async function ouvrirDetail(urgence: Urgence): Promise<void> {
  modalDetailOuvert.value = true;
  chargementDetail.value = true;
  try {
    detailEnCours.value = await urgencesService.findUrgence(urgence.id);
  } finally {
    chargementDetail.value = false;
  }
}

async function rafraichirDetailSiOuvert(urgenceId: string): Promise<void> {
  if (modalDetailOuvert.value && detailEnCours.value?.id === urgenceId) {
    detailEnCours.value = await urgencesService.findUrgence(urgenceId);
  }
}

async function prendreEnCharge(): Promise<void> {
  if (!detailEnCours.value) return;
  await urgencesService.priseEnChargeUrgence(detailEnCours.value.patientId, detailEnCours.value.id);
  message.success('Patient pris en charge.');
  await ouvrirDetail(detailEnCours.value);
  await charger();
}

// --- Triage (mise à jour) ---
const formulaireTriage = reactive({
  niveau: undefined as NiveauTriage | undefined,
  tensionArterielle: '',
  pouls: undefined as number | undefined,
  saturationO2: undefined as number | undefined,
});

async function soumettreTriage(): Promise<void> {
  if (!detailEnCours.value || !formulaireTriage.niveau) return;
  await urgencesService.trierUrgence(detailEnCours.value.id, {
    niveau: formulaireTriage.niveau,
    tensionArterielle: formulaireTriage.tensionArterielle || undefined,
    pouls: formulaireTriage.pouls,
    saturationO2: formulaireTriage.saturationO2,
  });
  message.success('Triage mis à jour.');
  formulaireTriage.niveau = undefined;
  formulaireTriage.tensionArterielle = '';
  formulaireTriage.pouls = undefined;
  formulaireTriage.saturationO2 = undefined;
  await ouvrirDetail(detailEnCours.value);
  await charger();
}

// --- Surveillance ---
const formulaireSurveillance = reactive({
  tensionArterielle: '',
  pouls: undefined as number | undefined,
  saturationO2: undefined as number | undefined,
  observation: '',
});

async function soumettreSurveillance(): Promise<void> {
  if (!detailEnCours.value) return;
  await urgencesService.ajouterSurveillance(detailEnCours.value.patientId, detailEnCours.value.id, {
    tensionArterielle: formulaireSurveillance.tensionArterielle || undefined,
    pouls: formulaireSurveillance.pouls,
    saturationO2: formulaireSurveillance.saturationO2,
    observation: formulaireSurveillance.observation || undefined,
  });
  message.success('Relevé de surveillance enregistré.');
  formulaireSurveillance.tensionArterielle = '';
  formulaireSurveillance.pouls = undefined;
  formulaireSurveillance.saturationO2 = undefined;
  formulaireSurveillance.observation = '';
  await ouvrirDetail(detailEnCours.value);
}

// --- Alertes ---
const formulaireAlerte = reactive({ type: '', message: '' });

async function soumettreAlerte(): Promise<void> {
  if (!detailEnCours.value || !formulaireAlerte.type || !formulaireAlerte.message) return;
  await urgencesService.creerAlerte(detailEnCours.value.patientId, detailEnCours.value.id, {
    type: formulaireAlerte.type,
    message: formulaireAlerte.message,
  });
  message.success('Alerte médicale levée.');
  formulaireAlerte.type = '';
  formulaireAlerte.message = '';
  await ouvrirDetail(detailEnCours.value);
}

async function acquitter(alerteId: string): Promise<void> {
  if (!detailEnCours.value) return;
  await urgencesService.acquitterAlerte(detailEnCours.value.patientId, detailEnCours.value.id, alerteId);
  message.success('Alerte acquittée.');
  await ouvrirDetail(detailEnCours.value);
}

// --- Clôture ---
const formulaireCloture = reactive({
  issue: undefined as IssueUrgence | undefined,
  serviceId: undefined as string | undefined,
  litId: undefined as string | undefined,
});
const servicesDestination = ref<ServiceClinique[]>([]);
const litsDestination = ref<Lit[]>([]);

async function onChangementServiceDestination(): Promise<void> {
  formulaireCloture.litId = undefined;
  if (!formulaireCloture.serviceId) {
    litsDestination.value = [];
    return;
  }
  const resultat = await admissionsLitsService.findLits(1, 100, { serviceId: formulaireCloture.serviceId, statut: LitStatut.LIBRE });
  litsDestination.value = resultat.items;
}

async function chargerServicesDestination(): Promise<void> {
  if (servicesDestination.value.length) return;
  const resultat = await admissionsLitsService.findServices(1, 100);
  servicesDestination.value = resultat.items;
}

async function soumettreCloture(): Promise<void> {
  if (!detailEnCours.value || !formulaireCloture.issue) return;
  if (formulaireCloture.issue === IssueUrgence.TRANSFERT_HOSPITALISATION && !formulaireCloture.serviceId) {
    message.error('Choisissez un service destination pour le transfert.');
    return;
  }
  await urgencesService.cloturerUrgence(detailEnCours.value.patientId, detailEnCours.value.id, {
    issue: formulaireCloture.issue,
    serviceId: formulaireCloture.serviceId,
    litId: formulaireCloture.litId,
  });
  message.success('Épisode aux urgences clôturé.');
  formulaireCloture.issue = undefined;
  formulaireCloture.serviceId = undefined;
  formulaireCloture.litId = undefined;
  modalDetailOuvert.value = false;
  await charger();
}

function onEvenementTempsReel(): void {
  void charger();
  if (detailEnCours.value) {
    void rafraichirDetailSiOuvert(detailEnCours.value.id);
  }
}

onMounted(() => {
  void charger();
  void chargerServicesDestination();
  const socket = obtenirSocket();
  socket?.on('urgence:nouvelle', onEvenementTempsReel);
  socket?.on('urgence:triage-maj', onEvenementTempsReel);
  socket?.on('urgence:prise-en-charge', onEvenementTempsReel);
  socket?.on('urgence:surveillance', onEvenementTempsReel);
  socket?.on('urgence:alerte', onEvenementTempsReel);
  socket?.on('urgence:alerte-acquittee', onEvenementTempsReel);
  socket?.on('urgence:cloture', onEvenementTempsReel);
});

onUnmounted(() => {
  const socket = obtenirSocket();
  socket?.off('urgence:nouvelle', onEvenementTempsReel);
  socket?.off('urgence:triage-maj', onEvenementTempsReel);
  socket?.off('urgence:prise-en-charge', onEvenementTempsReel);
  socket?.off('urgence:surveillance', onEvenementTempsReel);
  socket?.off('urgence:alerte', onEvenementTempsReel);
  socket?.off('urgence:alerte-acquittee', onEvenementTempsReel);
  socket?.off('urgence:cloture', onEvenementTempsReel);
});
</script>

<template>
  <div>
    <div class="entete">
      <h2>Urgences</h2>
      <a-space>
        <a-select v-model:value="filtreStatut" placeholder="Filtrer par statut" allow-clear style="width: 200px" @change="onChangementFiltre">
          <a-select-option v-for="statut in Object.values(UrgenceStatut)" :key="statut" :value="statut">
            {{ LIBELLE_STATUT[statut as UrgenceStatut] }}
          </a-select-option>
        </a-select>
        <a-button v-if="peutTrier" type="primary" data-cy="urgence-nouvelle" @click="ouvrirCreation">Nouvel épisode</a-button>
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
        <template v-if="column.key === 'patient'">{{ libellePatient(record.patientId) }}</template>
        <template v-else-if="column.key === 'triage'">
          <a-tag :color="COULEUR_NIVEAU[record.niveauTriage as NiveauTriage]">{{ LIBELLE_NIVEAU[record.niveauTriage as NiveauTriage] }}</a-tag>
        </template>
        <template v-else-if="column.key === 'statut'">
          <a-tag :color="COULEUR_STATUT[record.statut as UrgenceStatut]">{{ LIBELLE_STATUT[record.statut as UrgenceStatut] }}</a-tag>
        </template>
        <template v-else-if="column.key === 'arrivee'">{{ new Date(record.dateArrivee).toLocaleString('fr-SN') }}</template>
        <template v-else-if="column.key === 'actions'">
          <a-button size="small" data-cy="urgence-ouvrir" @click="ouvrirDetail(record)">Ouvrir</a-button>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="modalCreationOuvert"
      title="Nouvel épisode aux urgences"
      :footer="etapeRecherchePatient ? null : undefined"
      :confirm-loading="enregistrementCreation"
      @ok="soumettreCreation"
    >
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
          <a-form-item label="Motif"><a-input v-model:value="formulaireCreation.motif" /></a-form-item>
          <a-form-item label="Niveau de triage">
            <a-select v-model:value="formulaireCreation.niveauTriage">
              <a-select-option v-for="niveau in Object.values(NiveauTriage)" :key="niveau" :value="niveau">
                {{ LIBELLE_NIVEAU[niveau as NiveauTriage] }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
      </template>
    </a-modal>

    <a-modal v-model:open="modalDetailOuvert" title="Épisode aux urgences" :footer="null" width="800">
      <a-spin :spinning="chargementDetail">
        <template v-if="detailEnCours">
          <a-descriptions :column="2" size="small" bordered style="margin-bottom: 16px">
            <a-descriptions-item label="Motif">{{ detailEnCours.motif }}</a-descriptions-item>
            <a-descriptions-item label="Statut">
              <a-tag :color="COULEUR_STATUT[detailEnCours.statut]">{{ LIBELLE_STATUT[detailEnCours.statut] }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="Triage actuel">
              <a-tag :color="COULEUR_NIVEAU[detailEnCours.niveauTriage]">{{ LIBELLE_NIVEAU[detailEnCours.niveauTriage] }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="Arrivée">{{ new Date(detailEnCours.dateArrivee).toLocaleString('fr-SN') }}</a-descriptions-item>
          </a-descriptions>

          <a-button
            v-if="peutPrendreEnCharge && detailEnCours.statut === UrgenceStatut.EN_ATTENTE"
            type="primary"
            data-cy="urgence-prise-en-charge"
            style="margin-bottom: 16px"
            @click="prendreEnCharge"
          >
            Prendre en charge
          </a-button>

          <a-tabs>
            <a-tab-pane v-if="peutTrier" key="triage" tab="Triage">
              <a-table :data-source="detailEnCours.triages" row-key="id" :pagination="false" size="small" style="margin-bottom: 16px">
                <a-table-column title="Niveau" :customRender="rendreNiveauTriageDeLigne" />
                <a-table-column title="Tension" data-index="tensionArterielle" />
                <a-table-column title="Pouls" data-index="pouls" />
                <a-table-column title="SpO2" data-index="saturationO2" />
              </a-table>
              <a-form v-if="detailEnCours.statut === UrgenceStatut.EN_ATTENTE || detailEnCours.statut === UrgenceStatut.EN_COURS" layout="inline">
                <a-form-item>
                  <a-select v-model:value="formulaireTriage.niveau" placeholder="Nouveau niveau" style="width: 160px">
                    <a-select-option v-for="niveau in Object.values(NiveauTriage)" :key="niveau" :value="niveau">{{ LIBELLE_NIVEAU[niveau as NiveauTriage] }}</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item><a-input v-model:value="formulaireTriage.tensionArterielle" placeholder="Tension" style="width: 100px" /></a-form-item>
                <a-form-item><a-input-number v-model:value="formulaireTriage.pouls" placeholder="Pouls" style="width: 90px" /></a-form-item>
                <a-form-item><a-input-number v-model:value="formulaireTriage.saturationO2" placeholder="SpO2" style="width: 90px" /></a-form-item>
                <a-form-item><a-button :disabled="!formulaireTriage.niveau" @click="soumettreTriage">Mettre à jour</a-button></a-form-item>
              </a-form>
            </a-tab-pane>

            <a-tab-pane key="surveillance" tab="Surveillance">
              <a-table :data-source="detailEnCours.surveillances" row-key="id" :pagination="false" size="small" style="margin-bottom: 16px">
                <a-table-column title="Tension" data-index="tensionArterielle" />
                <a-table-column title="Pouls" data-index="pouls" />
                <a-table-column title="SpO2" data-index="saturationO2" />
                <a-table-column title="Observation" data-index="observation" />
                <a-table-column title="Date" :customRender="rendreDateSurveillance" />
              </a-table>
              <a-form v-if="peutSurveiller" layout="inline">
                <a-form-item><a-input v-model:value="formulaireSurveillance.tensionArterielle" placeholder="Tension" style="width: 100px" /></a-form-item>
                <a-form-item><a-input-number v-model:value="formulaireSurveillance.pouls" placeholder="Pouls" style="width: 90px" /></a-form-item>
                <a-form-item><a-input-number v-model:value="formulaireSurveillance.saturationO2" placeholder="SpO2" style="width: 90px" /></a-form-item>
                <a-form-item><a-input v-model:value="formulaireSurveillance.observation" placeholder="Observation" style="width: 180px" /></a-form-item>
                <a-form-item><a-button @click="soumettreSurveillance">Enregistrer</a-button></a-form-item>
              </a-form>
            </a-tab-pane>

            <a-tab-pane key="alertes" tab="Alertes">
              <a-list :data-source="detailEnCours.alertes" size="small" style="margin-bottom: 16px">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <a-list-item-meta :description="item.message">
                      <template #title>{{ item.type }}</template>
                    </a-list-item-meta>
                    <a-tag :color="item.statut === AlerteUrgenceStatut.ACQUITTEE ? 'green' : 'red'">{{ item.statut }}</a-tag>
                    <a-button v-if="peutAlerter && item.statut !== AlerteUrgenceStatut.ACQUITTEE" size="small" @click="acquitter(item.id)">
                      Acquitter
                    </a-button>
                  </a-list-item>
                </template>
              </a-list>
              <a-form v-if="peutAlerter" layout="inline">
                <a-form-item><a-input v-model:value="formulaireAlerte.type" placeholder="Type (ex. DETRESSE_VITALE)" style="width: 200px" /></a-form-item>
                <a-form-item><a-input v-model:value="formulaireAlerte.message" placeholder="Message" style="width: 220px" /></a-form-item>
                <a-form-item><a-button danger :disabled="!formulaireAlerte.type || !formulaireAlerte.message" @click="soumettreAlerte">Lever l’alerte</a-button></a-form-item>
              </a-form>
            </a-tab-pane>

            <a-tab-pane
              v-if="peutPrendreEnCharge && (detailEnCours.statut === UrgenceStatut.EN_ATTENTE || detailEnCours.statut === UrgenceStatut.EN_COURS)"
              key="cloture"
              tab="Clôture"
            >
              <a-form layout="vertical">
                <a-form-item label="Issue">
                  <a-select v-model:value="formulaireCloture.issue">
                    <a-select-option :value="IssueUrgence.TRANSFERT_HOSPITALISATION">Transfert vers hospitalisation</a-select-option>
                    <a-select-option :value="IssueUrgence.SORTIE">Sortie</a-select-option>
                    <a-select-option :value="IssueUrgence.DECES">Décès</a-select-option>
                  </a-select>
                </a-form-item>
                <template v-if="formulaireCloture.issue === IssueUrgence.TRANSFERT_HOSPITALISATION">
                  <a-form-item label="Service destination">
                    <a-select v-model:value="formulaireCloture.serviceId" @change="onChangementServiceDestination">
                      <a-select-option v-for="service in servicesDestination" :key="service.id" :value="service.id">{{ service.nom }}</a-select-option>
                    </a-select>
                  </a-form-item>
                  <a-form-item label="Lit (optionnel)">
                    <a-select v-model:value="formulaireCloture.litId" allow-clear :disabled="!formulaireCloture.serviceId">
                      <a-select-option v-for="lit in litsDestination" :key="lit.id" :value="lit.id">Lit {{ lit.numero }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </template>
                <a-button type="primary" data-cy="urgence-cloture" :disabled="!formulaireCloture.issue" @click="soumettreCloture">Clôturer</a-button>
              </a-form>
            </a-tab-pane>
          </a-tabs>
        </template>
      </a-spin>
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
