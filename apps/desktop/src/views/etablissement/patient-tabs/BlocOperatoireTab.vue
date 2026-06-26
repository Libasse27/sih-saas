<script setup lang="ts">
import { InterventionStatut, Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, ref } from 'vue';
import * as blocService from '../../../services/bloc-operatoire.service';
import type { Intervention } from '../../../services/bloc-operatoire.service';
import { useAuthStore } from '../../../stores/auth.store';

const props = defineProps<{ patientId: string }>();
const auth = useAuthStore();
const peutRealiser = auth.aPermission(Permission.BLOC_REALISATION);

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
  { title: 'Type', dataIndex: 'typeIntervention', key: 'typeIntervention' },
  { title: 'Date prévue', key: 'dateHeurePrevue' },
  { title: 'Durée estimée', key: 'dureeEstimeeMinutes' },
  { title: 'Statut', key: 'statut' },
  { title: 'Actions', key: 'actions' },
];

const interventions = ref<Intervention[]>([]);
const chargement = ref(false);
const lectureRefusee = ref(false);

async function charger(): Promise<void> {
  chargement.value = true;
  lectureRefusee.value = false;
  try {
    const res = await blocService.findAllInterventions(1, 50, { patientId: props.patientId });
    interventions.value = res.items;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 403) {
      // 403 : permission BLOC_VIEW insuffisante
      lectureRefusee.value = true;
    } else {
      // Réseau / erreur serveur — laisser remonter à l'intercepteur global ou afficher un toast
      message.error('Erreur lors du chargement des interventions.');
    }
  } finally {
    chargement.value = false;
  }
}

async function demarrer(intervention: Intervention): Promise<void> {
  await blocService.demarrerIntervention(props.patientId, intervention.id);
  message.success('Intervention démarrée.');
  await charger();
}

async function terminer(intervention: Intervention): Promise<void> {
  await blocService.terminerIntervention(props.patientId, intervention.id);
  message.success('Intervention terminée.');
  await charger();
}

onMounted(charger);
</script>

<template>
  <div>
    <a-alert
      v-if="lectureRefusee"
      type="warning"
      show-icon
      message="Accès non autorisé au bloc opératoire — permissions insuffisantes."
      style="margin-bottom: 16px"
    />

    <a-spin :spinning="chargement">
      <a-table
        v-if="!lectureRefusee"
        :columns="colonnes"
        :data-source="interventions"
        row-key="id"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'dateHeurePrevue'">
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
            <a-space v-if="peutRealiser">
              <a-button
                v-if="(record as Intervention).statut === InterventionStatut.PLANIFIEE"
                size="small"
                type="primary"
                @click="demarrer(record as Intervention)"
              >
                Démarrer
              </a-button>
              <a-button
                v-if="(record as Intervention).statut === InterventionStatut.EN_COURS"
                size="small"
                @click="terminer(record as Intervention)"
              >
                Terminer
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-spin>
  </div>
</template>
