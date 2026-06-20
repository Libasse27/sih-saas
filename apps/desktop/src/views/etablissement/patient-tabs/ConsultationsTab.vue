<script setup lang="ts">
import { Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as consultationsService from '../../../services/consultations.service';
import type { Consultation } from '../../../services/consultations.service';
import { useAuthStore } from '../../../stores/auth.store';

const props = defineProps<{ patientId: string }>();

const auth = useAuthStore();
const peutCreer = auth.aPermission(Permission.CONSULTATION_CREATE);

const items = ref<Consultation[]>([]);
const chargement = ref(true);
const lectureRefusee = ref(false);

const modalOuvert = ref(false);
const enregistrement = ref(false);
const formulaire = reactive({ motif: '', examenClinique: '', diagnosticCim10: '', conclusion: '' });

async function charger(): Promise<void> {
  chargement.value = true;
  lectureRefusee.value = false;
  try {
    const resultat = await consultationsService.findAll(props.patientId, 1, 50);
    items.value = resultat.items;
  } catch {
    lectureRefusee.value = true;
  } finally {
    chargement.value = false;
  }
}

function ouvrirCreation(): void {
  formulaire.motif = '';
  formulaire.examenClinique = '';
  formulaire.diagnosticCim10 = '';
  formulaire.conclusion = '';
  modalOuvert.value = true;
}

async function soumettre(): Promise<void> {
  enregistrement.value = true;
  try {
    await consultationsService.create(props.patientId, {
      motif: formulaire.motif,
      examenClinique: formulaire.examenClinique || undefined,
      diagnosticCim10: formulaire.diagnosticCim10 || undefined,
      conclusion: formulaire.conclusion || undefined,
    });
    message.success('Consultation enregistrée.');
    modalOuvert.value = false;
    await charger();
  } finally {
    enregistrement.value = false;
  }
}

onMounted(charger);
</script>

<template>
  <a-spin :spinning="chargement">
    <a-alert
      v-if="lectureRefusee"
      type="warning"
      show-icon
      message="Aucun lien de soin actif avec ce patient — historique des consultations non visible."
      style="margin-bottom: 16px"
    />

    <template v-else>
      <div class="entete">
        <a-button v-if="peutCreer" type="primary" @click="ouvrirCreation">Nouvelle consultation</a-button>
      </div>

      <a-list :data-source="[...items].reverse()" :locale="{ emptyText: 'Aucune consultation enregistrée.' }">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta :description="new Date(item.date).toLocaleString('fr-SN')">
              <template #title>{{ item.motif }}</template>
            </a-list-item-meta>
            <div>
              <p v-if="item.examenClinique"><strong>Examen clinique :</strong> {{ item.examenClinique }}</p>
              <p v-if="item.diagnosticCim10"><strong>Diagnostic (CIM-10) :</strong> {{ item.diagnosticCim10 }}</p>
              <p v-if="item.conclusion"><strong>Conclusion :</strong> {{ item.conclusion }}</p>
            </div>
          </a-list-item>
        </template>
      </a-list>
    </template>

    <a-modal v-model:open="modalOuvert" title="Nouvelle consultation" :confirm-loading="enregistrement" @ok="soumettre">
      <a-form layout="vertical">
        <a-form-item label="Motif"><a-input v-model:value="formulaire.motif" /></a-form-item>
        <a-form-item label="Examen clinique"><a-textarea v-model:value="formulaire.examenClinique" :rows="2" /></a-form-item>
        <a-form-item label="Diagnostic (CIM-10)"><a-input v-model:value="formulaire.diagnosticCim10" /></a-form-item>
        <a-form-item label="Conclusion"><a-textarea v-model:value="formulaire.conclusion" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>
  </a-spin>
</template>

<style scoped>
.entete {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}
</style>
