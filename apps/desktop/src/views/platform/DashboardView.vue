<script setup lang="ts">
import { EtablissementStatut } from '@sih-saas/shared';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { computed, onMounted, ref } from 'vue';
import { Doughnut } from 'vue-chartjs';
import * as subscriptionsService from '../../services/subscriptions.service';

ChartJS.register(ArcElement, Tooltip, Legend);

const chargement = ref(true);
const statistiques = ref<Awaited<ReturnType<typeof subscriptionsService.getStatistiques>> | null>(null);

const LIBELLE_STATUT: Record<EtablissementStatut, string> = {
  [EtablissementStatut.ACTIF]: 'Actifs',
  [EtablissementStatut.SUSPENDU]: 'Suspendus',
  [EtablissementStatut.EXPIRE]: 'Expirés',
  [EtablissementStatut.EN_ATTENTE_PAIEMENT]: 'En attente de paiement',
  [EtablissementStatut.ESSAI]: 'À l’essai',
};

const totalEtablissements = computed(() =>
  statistiques.value ? Object.values(statistiques.value.etablissements).reduce((a, b) => a + b, 0) : 0,
);

const donneesGraphique = computed(() => ({
  labels: Object.values(EtablissementStatut).map((statut) => LIBELLE_STATUT[statut]),
  datasets: [
    {
      data: statistiques.value
        ? Object.values(EtablissementStatut).map((statut) => statistiques.value!.etablissements[statut] ?? 0)
        : [],
      backgroundColor: ['#52c41a', '#ff4d4f', '#8c8c8c', '#faad14', '#1677ff'],
    },
  ],
}));

function formaterFcfa(montant: number): string {
  return new Intl.NumberFormat('fr-SN', { maximumFractionDigits: 0 }).format(montant) + ' FCFA';
}

onMounted(async () => {
  statistiques.value = await subscriptionsService.getStatistiques();
  chargement.value = false;
});
</script>

<template>
  <a-spin :spinning="chargement">
    <a-row :gutter="16">
      <a-col :span="4" v-for="statut in Object.values(EtablissementStatut)" :key="statut">
        <a-card size="small">
          <a-statistic :title="LIBELLE_STATUT[statut]" :value="statistiques?.etablissements[statut] ?? 0" />
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card size="small">
          <a-statistic title="Total établissements" :value="totalEtablissements" />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="6">
        <a-card>
          <a-statistic title="MRR (revenu mensuel récurrent)" :value="formaterFcfa(statistiques?.mrr ?? 0)" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="ARR (revenu annuel récurrent)" :value="formaterFcfa(statistiques?.arr ?? 0)" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="Abonnements actifs" :value="statistiques?.abonnementsActifs ?? 0" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="Utilisateurs internes (toutes plateformes)" :value="statistiques?.usage.utilisateurs ?? 0" />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="12">
        <a-card title="Répartition des établissements par statut">
          <Doughnut v-if="statistiques" :data="donneesGraphique" :options="{ maintainAspectRatio: true }" />
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="Usage cumulé">
          <a-statistic title="Lits" :value="statistiques?.usage.lits ?? 0" style="margin-bottom: 16px" />
          <a-statistic title="Stockage (Mo)" :value="statistiques?.usage.stockageMo ?? 0" />
        </a-card>
      </a-col>
    </a-row>
  </a-spin>
</template>
