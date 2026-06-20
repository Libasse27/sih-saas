<script setup lang="ts">
import { FacturePatientStatut, Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as facturationService from '../../services/facturation-patient.service';
import type { FacturePatient } from '../../services/facturation-patient.service';
import { useAuthStore } from '../../stores/auth.store';

const router = useRouter();
const auth = useAuthStore();
const peutAnnuler = auth.aPermission(Permission.FACTURE_PATIENT_VALIDATE);

const LIBELLE_STATUT: Record<FacturePatientStatut, string> = {
  [FacturePatientStatut.EN_ATTENTE]: 'En attente',
  [FacturePatientStatut.PARTIELLEMENT_PAYEE]: 'Partiellement payée',
  [FacturePatientStatut.PAYEE]: 'Payée',
  [FacturePatientStatut.ANNULEE]: 'Annulée',
};

const COULEUR_STATUT: Record<FacturePatientStatut, string> = {
  [FacturePatientStatut.EN_ATTENTE]: 'orange',
  [FacturePatientStatut.PARTIELLEMENT_PAYEE]: 'blue',
  [FacturePatientStatut.PAYEE]: 'green',
  [FacturePatientStatut.ANNULEE]: 'default',
};

const items = ref<FacturePatient[]>([]);
const chargement = ref(false);
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const filtreStatut = ref<FacturePatientStatut | undefined>(undefined);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const resultat = await facturationService.findAllFactures(pagination.page, pagination.limit, filtreStatut.value);
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

async function annuler(facture: FacturePatient): Promise<void> {
  await facturationService.annulerFacture(facture.id);
  message.success('Facture annulée.');
  await charger();
}

onMounted(charger);
</script>

<template>
  <div>
    <div class="entete">
      <h2>Facturation — caisse</h2>
      <a-select v-model:value="filtreStatut" placeholder="Filtrer par statut" allow-clear style="width: 220px" @change="onChangementFiltre">
        <a-select-option v-for="statut in Object.values(FacturePatientStatut)" :key="statut" :value="statut">
          {{ LIBELLE_STATUT[statut] }}
        </a-select-option>
      </a-select>
    </div>

    <a-table
      :data-source="items"
      :loading="chargement"
      row-key="id"
      :pagination="{ current: pagination.page, pageSize: pagination.limit, total: pagination.total, onChange: changerPage }"
    >
      <a-table-column title="N°" data-index="numero" />
      <a-table-column title="Patient">
        <template #default="{ record }"><a @click="voirPatient(record.patientId)">{{ record.patientId.slice(0, 8) }}…</a></template>
      </a-table-column>
      <a-table-column title="Total">
        <template #default="{ record }">{{ record.montantTotal }} FCFA</template>
      </a-table-column>
      <a-table-column title="Part patient">
        <template #default="{ record }">{{ record.partPatient }} FCFA</template>
      </a-table-column>
      <a-table-column title="Statut">
        <template #default="{ record }">
          <a-tag :color="COULEUR_STATUT[record.statut as FacturePatientStatut]">{{ LIBELLE_STATUT[record.statut as FacturePatientStatut] }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column title="Actions">
        <template #default="{ record }">
          <a-popconfirm v-if="peutAnnuler && record.statut !== FacturePatientStatut.ANNULEE" title="Annuler cette facture ?" @confirm="annuler(record)">
            <a-button size="small" danger>Annuler</a-button>
          </a-popconfirm>
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
