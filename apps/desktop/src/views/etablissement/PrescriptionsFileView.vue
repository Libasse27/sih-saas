<script setup lang="ts">
import { PrescriptionStatut } from '@sih-saas/shared';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as prescriptionsService from '../../services/prescriptions.service';
import type { Prescription } from '../../services/prescriptions.service';

const router = useRouter();

const LIBELLE_STATUT: Record<PrescriptionStatut, string> = {
  [PrescriptionStatut.EN_ATTENTE]: 'En attente',
  [PrescriptionStatut.VALIDEE]: 'Validée',
  [PrescriptionStatut.DISPENSEE]: 'Dispensée',
  [PrescriptionStatut.ANNULEE]: 'Annulée',
};

const COULEUR_STATUT: Record<PrescriptionStatut, string> = {
  [PrescriptionStatut.EN_ATTENTE]: 'orange',
  [PrescriptionStatut.VALIDEE]: 'blue',
  [PrescriptionStatut.DISPENSEE]: 'green',
  [PrescriptionStatut.ANNULEE]: 'default',
};

const items = ref<Prescription[]>([]);
const chargement = ref(false);
// Par défaut : seules les prescriptions à dispenser — c'est le vrai besoin du pharmacien.
const filtreStatut = ref<PrescriptionStatut | undefined>(PrescriptionStatut.VALIDEE);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const resultat = await prescriptionsService.findFileDeTravail(1, 100, filtreStatut.value);
    items.value = resultat.items;
  } finally {
    chargement.value = false;
  }
}

function voirPatient(patientId: string): void {
  // Le détail + la dispensation elle-même restent dans l'onglet Prescriptions de la fiche patient
  // (déjà construit en Phase 13) — cette vue n'est qu'un point de découverte transversal.
  void router.push({ name: 'etablissement-patient-detail', params: { id: patientId } });
}

onMounted(charger);
</script>

<template>
  <div>
    <div class="entete">
      <h2>Prescriptions — file de travail</h2>
      <a-select v-model:value="filtreStatut" placeholder="Filtrer par statut" allow-clear style="width: 200px" @change="charger">
        <a-select-option v-for="statut in Object.values(PrescriptionStatut)" :key="statut" :value="statut">
          {{ LIBELLE_STATUT[statut] }}
        </a-select-option>
      </a-select>
    </div>

    <a-alert
      type="info"
      show-icon
      message="Découverte transversale uniquement — ouvrez la fiche patient pour consulter le détail et dispenser."
      style="margin-bottom: 16px"
    />

    <a-table :data-source="items" :loading="chargement" row-key="id" size="small">
      <a-table-column title="Date">
        <template #default="{ record }">{{ new Date(record.date).toLocaleDateString('fr-SN') }}</template>
      </a-table-column>
      <a-table-column title="Patient">
        <template #default="{ record }"><a @click="voirPatient(record.patientId)">{{ record.patientId.slice(0, 8) }}…</a></template>
      </a-table-column>
      <a-table-column title="Statut">
        <template #default="{ record }">
          <a-tag :color="COULEUR_STATUT[record.statut as PrescriptionStatut]">{{ LIBELLE_STATUT[record.statut as PrescriptionStatut] }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column title="Actions">
        <template #default="{ record }">
          <a-button size="small" @click="voirPatient(record.patientId)">Ouvrir le dossier</a-button>
        </template>
      </a-table-column>
    </a-table>
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
