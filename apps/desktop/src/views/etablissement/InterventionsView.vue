<!-- apps/desktop/src/views/etablissement/InterventionsView.vue -->
<script setup lang="ts">
import { InterventionStatut, Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as blocService from '../../services/bloc-operatoire.service';
import type { Intervention, SalleOperation } from '../../services/bloc-operatoire.service';
import { useAuthStore } from '../../stores/auth.store';

const auth = useAuthStore();
const peutPlanifier = auth.aPermission(Permission.BLOC_PLANIFICATION);

const LIBELLE_STATUT: Record<InterventionStatut, string> = {
  [InterventionStatut.PLANIFIEE]: 'Planifiée',
  [InterventionStatut.EN_COURS]: 'En cours',
  [InterventionStatut.TERMINEE]: 'Terminée',
  [InterventionStatut.ANNULEE]: 'Annulée',
};

const COULEUR_STATUT: Record<InterventionStatut, string> = {
  [InterventionStatut.PLANIFIEE]: 'blue',
  [InterventionStatut.EN_COURS]: 'orange',
  [InterventionStatut.TERMINEE]: 'green',
  [InterventionStatut.ANNULEE]: 'default',
};

const colonnes = [
  { title: 'Type d\'intervention', dataIndex: 'typeIntervention', key: 'typeIntervention' },
  { title: 'Salle', key: 'salle' },
  { title: 'Date prévue', key: 'dateHeurePrevue' },
  { title: 'Durée estimée', key: 'dureeEstimeeMinutes' },
  { title: 'Statut', key: 'statut' },
  { title: 'Actions', key: 'actions' },
];

const interventions = ref<Intervention[]>([]);
const salles = ref<SalleOperation[]>([]);
const chargement = ref(false);
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const filtreStatut = ref<InterventionStatut | undefined>(undefined);

const modalOuvert = ref(false);
const enregistrement = ref(false);
const formulaire = reactive({
  patientId: '',
  salleOperationId: '',
  chirurgienPrincipalId: '',
  typeIntervention: '',
  dateHeurePrevue: '',
  dureeEstimeeMinutes: undefined as number | undefined,
});

function sallePourId(id: string): string {
  return salles.value.find((s) => s.id === id)?.nom ?? id.substring(0, 8) + '...';
}

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const [res, sallesRes] = await Promise.all([
      blocService.findAllInterventions(pagination.page, pagination.limit, {
        statut: filtreStatut.value,
      }),
      salles.value.length === 0 ? blocService.findAllSalles(1, 100) : Promise.resolve(null),
    ]);
    interventions.value = res.items;
    pagination.total = res.total;
    if (sallesRes) salles.value = sallesRes.items;
  } finally {
    chargement.value = false;
  }
}

function changerFiltreStatut(statut: InterventionStatut | undefined): void {
  filtreStatut.value = statut;
  pagination.page = 1;
  void charger();
}

function ouvrirCreation(): void {
  formulaire.patientId = '';
  formulaire.salleOperationId = '';
  formulaire.chirurgienPrincipalId = '';
  formulaire.typeIntervention = '';
  formulaire.dateHeurePrevue = '';
  formulaire.dureeEstimeeMinutes = undefined;
  modalOuvert.value = true;
}

async function soumettre(): Promise<void> {
  if (!formulaire.patientId || !formulaire.salleOperationId || !formulaire.chirurgienPrincipalId || !formulaire.typeIntervention || !formulaire.dateHeurePrevue) {
    message.warning('Tous les champs obligatoires doivent être remplis.');
    return;
  }
  enregistrement.value = true;
  try {
    await blocService.createIntervention({
      patientId: formulaire.patientId,
      salleOperationId: formulaire.salleOperationId,
      chirurgienPrincipalId: formulaire.chirurgienPrincipalId,
      typeIntervention: formulaire.typeIntervention,
      dateHeurePrevue: new Date(formulaire.dateHeurePrevue).toISOString(),
      dureeEstimeeMinutes: formulaire.dureeEstimeeMinutes,
    });
    message.success('Intervention planifiée.');
    modalOuvert.value = false;
    await charger();
  } finally {
    enregistrement.value = false;
  }
}

async function annuler(intervention: Intervention): Promise<void> {
  await blocService.annulerIntervention(intervention.id);
  message.success('Intervention annulée.');
  await charger();
}

function onFiltreStatutChange(e: { target: { value: InterventionStatut | undefined } }): void {
  changerFiltreStatut(e.target.value);
}

function onPaginationChange(p: number): void {
  pagination.page = p;
  void charger();
}

onMounted(charger);
</script>

<template>
  <div>
    <div class="entete">
      <h2>Planning du bloc opératoire</h2>
      <a-button v-if="peutPlanifier" type="primary" @click="ouvrirCreation">Planifier une intervention</a-button>
    </div>

    <!-- Filtres -->
    <a-space style="margin-bottom: 16px">
      <span>Filtrer par statut :</span>
      <a-radio-group :value="filtreStatut" button-style="solid" @change="onFiltreStatutChange">
        <a-radio-button :value="undefined">Tous</a-radio-button>
        <a-radio-button v-for="statut in Object.values(InterventionStatut)" :key="statut" :value="statut">
          {{ LIBELLE_STATUT[statut] }}
        </a-radio-button>
      </a-radio-group>
    </a-space>

    <a-table
      :columns="colonnes"
      :data-source="interventions"
      :loading="chargement"
      row-key="id"
      :pagination="{
        current: pagination.page,
        pageSize: pagination.limit,
        total: pagination.total,
        onChange: onPaginationChange,
      }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'salle'">
          {{ sallePourId((record as Intervention).salleOperationId) }}
        </template>
        <template v-else-if="column.key === 'dateHeurePrevue'">
          {{ new Date((record as Intervention).dateHeurePrevue).toLocaleString('fr-SN') }}
        </template>
        <template v-else-if="column.key === 'dureeEstimeeMinutes'">
          {{ (record as Intervention).dureeEstimeeMinutes ? `${(record as Intervention).dureeEstimeeMinutes} min` : '—' }}
        </template>
        <template v-else-if="column.key === 'statut'">
          <a-tag :color="COULEUR_STATUT[(record as Intervention).statut]">
            {{ LIBELLE_STATUT[(record as Intervention).statut] }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-button
            v-if="peutPlanifier && (record as Intervention).statut === InterventionStatut.PLANIFIEE"
            danger
            size="small"
            @click="annuler(record as Intervention)"
          >
            Annuler
          </a-button>
        </template>
      </template>
    </a-table>

    <!-- Modal création -->
    <a-modal
      v-model:open="modalOuvert"
      title="Planifier une intervention"
      :confirm-loading="enregistrement"
      width="600px"
      @ok="soumettre"
    >
      <a-form layout="vertical">
        <a-form-item label="ID patient (UUID)">
          <a-input v-model:value="formulaire.patientId" placeholder="UUID du patient" />
        </a-form-item>
        <a-form-item label="Salle d'opération">
          <a-select v-model:value="formulaire.salleOperationId" placeholder="Sélectionner une salle">
            <a-select-option v-for="salle in salles" :key="salle.id" :value="salle.id">
              {{ salle.nom }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="ID chirurgien principal (UUID)">
          <a-input v-model:value="formulaire.chirurgienPrincipalId" placeholder="UUID du chirurgien" />
        </a-form-item>
        <a-form-item label="Type d'intervention">
          <a-input v-model:value="formulaire.typeIntervention" placeholder="Appendicectomie, Laparotomie..." />
        </a-form-item>
        <a-form-item label="Date et heure prévue">
          <a-input v-model:value="formulaire.dateHeurePrevue" type="datetime-local" />
        </a-form-item>
        <a-form-item label="Durée estimée (minutes, optionnel)">
          <a-input-number v-model:value="formulaire.dureeEstimeeMinutes" :min="1" style="width: 100%" placeholder="90" />
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
