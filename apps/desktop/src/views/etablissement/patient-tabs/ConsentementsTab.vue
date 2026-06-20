<script setup lang="ts">
import { TypeConsentement } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { computed, onMounted, ref } from 'vue';
import * as patientsService from '../../../services/patients.service';
import type { ConsentementEntry, Patient } from '../../../services/patients.service';

const props = defineProps<{ patientId: string }>();

const LIBELLE_TYPE: Record<TypeConsentement, string> = {
  [TypeConsentement.TRAITEMENT_DONNEES_SANTE]: 'Traitement des données de santé',
  [TypeConsentement.PARTAGE_ASSURANCE]: "Partage avec l'assurance (tiers-payant)",
  [TypeConsentement.COMMUNICATION_ELECTRONIQUE]: 'Communications électroniques (SMS/email)',
};

const patient = ref<Patient | null>(null);
const chargement = ref(true);
const enregistrement = ref<TypeConsentement | null>(null);

// État actuel par type = la dernière entrée enregistrée de ce type (jamais réécrite, voir backend).
const statutActuel = computed<Partial<Record<TypeConsentement, ConsentementEntry>>>(() => {
  const statut: Partial<Record<TypeConsentement, ConsentementEntry>> = {};
  for (const entree of patient.value?.consentements ?? []) {
    statut[entree.type] = entree;
  }
  return statut;
});

const historique = computed(() => [...(patient.value?.consentements ?? [])].reverse());

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    patient.value = await patientsService.findById(props.patientId);
  } finally {
    chargement.value = false;
  }
}

async function basculer(type: TypeConsentement, valeur: boolean): Promise<void> {
  enregistrement.value = type;
  try {
    patient.value = await patientsService.enregistrerConsentement(props.patientId, type, valeur);
    message.success('Consentement enregistré.');
  } finally {
    enregistrement.value = null;
  }
}

onMounted(charger);
</script>

<template>
  <a-spin :spinning="chargement">
    <a-alert
      type="info"
      show-icon
      message="Le traitement des données de santé est une donnée sensible — la loi sénégalaise (n°2008-12) exige un consentement préalable du patient."
      style="margin-bottom: 16px"
    />

    <a-list :data-source="Object.values(TypeConsentement)" bordered style="margin-bottom: 24px">
      <template #renderItem="{ item: type }">
        <a-list-item>
          <a-list-item-meta :title="LIBELLE_TYPE[type as TypeConsentement]">
            <template #description>
              <span v-if="statutActuel[type as TypeConsentement]">
                {{ statutActuel[type as TypeConsentement]!.valeur ? 'Accepté' : 'Refusé' }} le
                {{ new Date(statutActuel[type as TypeConsentement]!.date).toLocaleString('fr-SN') }}
              </span>
              <span v-else>Jamais demandé</span>
            </template>
          </a-list-item-meta>
          <a-space>
            <a-button
              size="small"
              type="primary"
              :loading="enregistrement === type"
              :disabled="statutActuel[type as TypeConsentement]?.valeur === true"
              @click="basculer(type as TypeConsentement, true)"
            >
              Accepter
            </a-button>
            <a-button
              size="small"
              danger
              :loading="enregistrement === type"
              :disabled="statutActuel[type as TypeConsentement]?.valeur === false"
              @click="basculer(type as TypeConsentement, false)"
            >
              Refuser
            </a-button>
          </a-space>
        </a-list-item>
      </template>
    </a-list>

    <h4>Historique</h4>
    <a-table :data-source="historique" row-key="date" size="small" :pagination="false">
      <a-table-column title="Type">
        <template #default="{ record }">{{ LIBELLE_TYPE[record.type as TypeConsentement] }}</template>
      </a-table-column>
      <a-table-column title="Décision">
        <template #default="{ record }">
          <a-tag :color="record.valeur ? 'green' : 'red'">{{ record.valeur ? 'Accepté' : 'Refusé' }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column title="Date">
        <template #default="{ record }">{{ new Date(record.date).toLocaleString('fr-SN') }}</template>
      </a-table-column>
      <a-table-column title="Enregistré par">
        <template #default="{ record }">{{ record.enregistrePar.slice(0, 8) }}…</template>
      </a-table-column>
    </a-table>
  </a-spin>
</template>
