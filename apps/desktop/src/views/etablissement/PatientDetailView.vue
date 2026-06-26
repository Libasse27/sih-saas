<script setup lang="ts">
import { Permission, Sexe } from '@sih-saas/shared';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as patientsService from '../../services/patients.service';
import type { Patient } from '../../services/patients.service';
import { useAuthStore } from '../../stores/auth.store';
import AdministrationTab from './patient-tabs/AdministrationTab.vue';
import BlocOperatoireTab from './patient-tabs/BlocOperatoireTab.vue';
import ConsentementsTab from './patient-tabs/ConsentementsTab.vue';
import ConsultationsTab from './patient-tabs/ConsultationsTab.vue';
import DossierMedicalTab from './patient-tabs/DossierMedicalTab.vue';
import FacturationTab from './patient-tabs/FacturationTab.vue';
import ImagerieTab from './patient-tabs/ImagerieTab.vue';
import LaboratoireTab from './patient-tabs/LaboratoireTab.vue';
import PrescriptionsTab from './patient-tabs/PrescriptionsTab.vue';

const props = defineProps<{ id: string }>();
const router = useRouter();
const auth = useAuthStore();

const patient = ref<Patient | null>(null);
const chargement = ref(true);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    patient.value = await patientsService.findById(props.id);
  } finally {
    chargement.value = false;
  }
}

onMounted(charger);
</script>

<template>
  <div>
    <a-button style="margin-bottom: 16px" @click="router.push({ name: 'etablissement-patients' })">← Retour</a-button>

    <a-spin :spinning="chargement">
      <a-card v-if="patient" style="margin-bottom: 16px">
        <a-descriptions :column="3" bordered size="small">
          <a-descriptions-item label="IDH">{{ patient.idh }}</a-descriptions-item>
          <a-descriptions-item label="Nom">{{ patient.prenom }} {{ patient.nom }}</a-descriptions-item>
          <a-descriptions-item label="Sexe">{{ patient.sexe === Sexe.M ? 'Masculin' : 'Féminin' }}</a-descriptions-item>
          <a-descriptions-item label="Date de naissance">{{ new Date(patient.dateNaissance).toLocaleDateString('fr-SN') }}</a-descriptions-item>
          <a-descriptions-item label="Téléphone">{{ patient.telephone ?? '—' }}</a-descriptions-item>
          <a-descriptions-item label="Adresse">{{ patient.adresse ?? '—' }}</a-descriptions-item>
        </a-descriptions>
      </a-card>

      <a-tabs v-if="patient">
        <a-tab-pane key="dossier" tab="Dossier médical">
          <DossierMedicalTab :patient-id="patient.id" />
        </a-tab-pane>
        <a-tab-pane key="consultations" tab="Consultations">
          <ConsultationsTab :patient-id="patient.id" />
        </a-tab-pane>
        <a-tab-pane key="prescriptions" tab="Prescriptions">
          <PrescriptionsTab :patient-id="patient.id" />
        </a-tab-pane>
        <a-tab-pane key="administration" tab="Administration">
          <AdministrationTab :patient-id="patient.id" />
        </a-tab-pane>
        <a-tab-pane key="laboratoire" tab="Laboratoire">
          <LaboratoireTab :patient-id="patient.id" />
        </a-tab-pane>
        <a-tab-pane key="imagerie" tab="Imagerie">
          <ImagerieTab :patient-id="patient.id" />
        </a-tab-pane>
        <a-tab-pane key="facturation" tab="Facturation">
          <FacturationTab :patient-id="patient.id" />
        </a-tab-pane>
        <a-tab-pane key="consentements" tab="Consentements">
          <ConsentementsTab :patient-id="patient.id" />
        </a-tab-pane>
        <a-tab-pane v-if="auth.aPermission(Permission.BLOC_VIEW)" key="bloc" tab="Bloc opératoire">
          <BlocOperatoireTab :patient-id="patient.id" />
        </a-tab-pane>
      </a-tabs>
    </a-spin>
  </div>
</template>
