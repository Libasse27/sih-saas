<script setup lang="ts">
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'vue-chartjs';
import {
  DemandeStatut,
  InterventionStatut,
  LitStatut,
  NiveauTriage,
  SalleOperationStatut,
} from '@sih-saas/shared';
import { onMounted, ref, computed } from 'vue';
import * as dashboardService from '../../services/dashboard.service';
import type { DashboardEtablissement } from '../../services/dashboard.service';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const chargement = ref(true);
const stats = ref<DashboardEtablissement | null>(null);

// ── Labels ────────────────────────────────────────────────────────────────────

const LIBELLE_LIT: Record<LitStatut, string> = {
  [LitStatut.LIBRE]: 'Libres',
  [LitStatut.OCCUPE]: 'Occupés',
  [LitStatut.RESERVE]: 'Réservés',
  [LitStatut.MAINTENANCE]: 'Maintenance',
};

const COULEUR_LIT: Record<LitStatut, string> = {
  [LitStatut.LIBRE]: '#52c41a',
  [LitStatut.OCCUPE]: '#ff4d4f',
  [LitStatut.RESERVE]: '#faad14',
  [LitStatut.MAINTENANCE]: '#8c8c8c',
};

const LIBELLE_NIVEAU: Record<NiveauTriage, string> = {
  [NiveauTriage.VITAL]: 'Vital',
  [NiveauTriage.TRES_URGENT]: 'Très urgent',
  [NiveauTriage.URGENT]: 'Urgent',
  [NiveauTriage.PEU_URGENT]: 'Peu urgent',
  [NiveauTriage.NON_URGENT]: 'Non urgent',
};

const COULEUR_NIVEAU: Record<NiveauTriage, string> = {
  [NiveauTriage.VITAL]: '#ff4d4f',
  [NiveauTriage.TRES_URGENT]: '#fa541c',
  [NiveauTriage.URGENT]: '#faad14',
  [NiveauTriage.PEU_URGENT]: '#1677ff',
  [NiveauTriage.NON_URGENT]: '#52c41a',
};

const LIBELLE_INTERVENTION: Record<InterventionStatut, string> = {
  [InterventionStatut.PLANIFIEE]: 'Planifiées',
  [InterventionStatut.EN_COURS]: 'En cours',
  [InterventionStatut.TERMINEE]: 'Terminées',
  [InterventionStatut.ANNULEE]: 'Annulées',
};

const LIBELLE_SALLE: Record<SalleOperationStatut, string> = {
  [SalleOperationStatut.LIBRE]: 'Libres',
  [SalleOperationStatut.OCCUPEE]: 'Occupées',
  [SalleOperationStatut.MAINTENANCE]: 'Maintenance',
};

const LIBELLE_DEMANDE: Record<DemandeStatut, string> = {
  [DemandeStatut.EN_ATTENTE]: 'En attente',
  [DemandeStatut.EN_COURS]: 'En cours',
  [DemandeStatut.TERMINEE]: 'Terminées',
  [DemandeStatut.ANNULEE]: 'Annulées',
};

// ── Helpers (extraits de script pour éviter les annotations génériques inline dans le template) ──

function libelleLit(s: LitStatut): string { return LIBELLE_LIT[s]; }
function couleurLit(s: LitStatut): string { return COULEUR_LIT[s]; }
function libelleNiveau(n: NiveauTriage): string { return LIBELLE_NIVEAU[n]; }
function libelleSalle(s: SalleOperationStatut): string { return LIBELLE_SALLE[s]; }
function statLit(s: LitStatut): number { return stats.value?.lits.parStatut[s] ?? 0; }
function statSalle(s: SalleOperationStatut): number { return stats.value?.bloc.sallesParStatut[s] ?? 0; }

// ── Données graphiques ────────────────────────────────────────────────────────

const donneesLits = computed(() => ({
  labels: Object.values(LitStatut).map(libelleLit),
  datasets: [
    {
      data: Object.values(LitStatut).map((s) => stats.value?.lits.parStatut[s] ?? 0),
      backgroundColor: Object.values(LitStatut).map(couleurLit),
    },
  ],
}));

const donneesUrgences = computed(() => ({
  labels: Object.values(NiveauTriage).map(libelleNiveau),
  datasets: [
    {
      label: 'Épisodes actifs',
      data: Object.values(NiveauTriage).map((n) => stats.value?.urgences.parNiveau[n] ?? 0),
      backgroundColor: Object.values(NiveauTriage).map((n) => COULEUR_NIVEAU[n]),
    },
  ],
}));

const donneesInterventions = computed(() => ({
  labels: Object.values(InterventionStatut).map((s) => LIBELLE_INTERVENTION[s]),
  datasets: [
    {
      label: "Interventions aujourd'hui",
      data: Object.values(InterventionStatut).map(
        (s) => stats.value?.bloc.interventionsAujourdhuiParStatut[s] ?? 0,
      ),
      backgroundColor: ['#1677ff', '#fa8c16', '#52c41a', '#8c8c8c'],
    },
  ],
}));

const DEMANDES_STATUTS = [DemandeStatut.EN_ATTENTE, DemandeStatut.EN_COURS, DemandeStatut.TERMINEE] as const;

const donneesLabo = computed(() => ({
  labels: DEMANDES_STATUTS.map((s) => LIBELLE_DEMANDE[s]),
  datasets: [
    {
      label: 'Labo',
      data: DEMANDES_STATUTS.map((s) => stats.value?.labo.parStatut[s] ?? 0),
      backgroundColor: ['#faad14', '#1677ff', '#52c41a'],
    },
  ],
}));

const donneesImagerie = computed(() => ({
  labels: DEMANDES_STATUTS.map((s) => LIBELLE_DEMANDE[s]),
  datasets: [
    {
      label: 'Imagerie',
      data: DEMANDES_STATUTS.map((s) => stats.value?.imagerie.parStatut[s] ?? 0),
      backgroundColor: ['#faad14', '#1677ff', '#52c41a'],
    },
  ],
}));

const chartOptions = { maintainAspectRatio: true, responsive: true };

function formaterFcfa(montant: number): string {
  return new Intl.NumberFormat('fr-SN', { maximumFractionDigits: 0 }).format(montant) + ' FCFA';
}

onMounted(async () => {
  try {
    stats.value = await dashboardService.getDashboardEtablissement();
  } finally {
    chargement.value = false;
  }
});
</script>

<template>
  <a-spin :spinning="chargement">
    <!-- ── Hospitalisation ──────────────────────────────────────────────── -->
    <a-card title="Hospitalisation" style="margin-bottom: 16px">
      <a-row :gutter="16">
        <a-col :xs="24" :sm="6">
          <a-statistic title="Taux d'occupation" :value="stats?.lits.tauxOccupation ?? 0" suffix="%" />
        </a-col>
        <a-col :xs="24" :sm="6">
          <a-statistic title="Admissions en cours" :value="stats?.lits.admissionsEnCours ?? 0" />
        </a-col>
        <a-col
          v-for="statut in Object.values(LitStatut)"
          :key="statut"
          :xs="12"
          :sm="3"
        >
          <a-statistic :title="libelleLit(statut)" :value="statLit(statut)" />
        </a-col>
        <a-col :xs="24" :sm="12" style="margin-top: 16px">
          <Doughnut v-if="stats" :data="donneesLits" :options="chartOptions" />
        </a-col>
      </a-row>
    </a-card>

    <!-- ── Urgences ─────────────────────────────────────────────────────── -->
    <a-card title="Urgences" style="margin-bottom: 16px">
      <a-row :gutter="16">
        <a-col :xs="24" :sm="8">
          <a-statistic title="Épisodes actifs" :value="stats?.urgences.actifs ?? 0" />
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-statistic title="Clôturés aujourd'hui" :value="stats?.urgences.cloturesToday ?? 0" />
        </a-col>
        <a-col :xs="24" :sm="16" style="margin-top: 16px">
          <Bar v-if="stats" :data="donneesUrgences" :options="chartOptions" />
        </a-col>
      </a-row>
    </a-card>

    <!-- ── Bloc opératoire ──────────────────────────────────────────────── -->
    <a-card title="Bloc opératoire" style="margin-bottom: 16px">
      <a-row :gutter="16">
        <a-col
          v-for="statut in Object.values(SalleOperationStatut)"
          :key="statut"
          :xs="8"
        >
          <a-statistic
            :title="'Salles ' + libelleSalle(statut).toLowerCase()"
            :value="statSalle(statut)"
          />
        </a-col>
      </a-row>
      <a-row :gutter="16" style="margin-top: 16px">
        <a-col :xs="24" :sm="16">
          <Bar v-if="stats" :data="donneesInterventions" :options="chartOptions" />
        </a-col>
      </a-row>
    </a-card>

    <!-- ── Labo & Imagerie ──────────────────────────────────────────────── -->
    <a-row :gutter="16" style="margin-bottom: 16px">
      <a-col :xs="24" :sm="12">
        <a-card title="Laboratoire">
          <a-row :gutter="8">
            <a-col :span="12">
              <a-statistic title="En attente" :value="stats?.labo.parStatut[DemandeStatut.EN_ATTENTE] ?? 0" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="En cours" :value="stats?.labo.parStatut[DemandeStatut.EN_COURS] ?? 0" />
            </a-col>
          </a-row>
          <Bar v-if="stats" :data="donneesLabo" :options="chartOptions" style="margin-top: 12px" />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12">
        <a-card title="Imagerie">
          <a-row :gutter="8">
            <a-col :span="12">
              <a-statistic title="En attente" :value="stats?.imagerie.parStatut[DemandeStatut.EN_ATTENTE] ?? 0" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="En cours" :value="stats?.imagerie.parStatut[DemandeStatut.EN_COURS] ?? 0" />
            </a-col>
          </a-row>
          <Bar v-if="stats" :data="donneesImagerie" :options="chartOptions" style="margin-top: 12px" />
        </a-card>
      </a-col>
    </a-row>

    <!-- ── Pharmacie / RH / Facturation ────────────────────────────────── -->
    <a-row :gutter="16">
      <a-col :xs="24" :sm="8">
        <a-card title="Pharmacie">
          <a-statistic
            title="Stocks sous seuil d'alerte"
            :value="stats?.pharmacie.stocksSousSeuilAlerte ?? 0"
            style="margin-bottom: 16px"
          />
          <a-statistic title="Prescriptions en attente" :value="stats?.pharmacie.prescriptionsEnAttente ?? 0" />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="8">
        <a-card title="Ressources humaines">
          <a-statistic
            title="Employés actifs"
            :value="stats?.rh.employesActifs ?? 0"
            style="margin-bottom: 16px"
          />
          <a-statistic title="Congés en cours" :value="stats?.rh.congesEnCours ?? 0" />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="8">
        <a-card title="Facturation du mois">
          <a-statistic
            title="Recettes"
            :value="formaterFcfa(stats?.facturation.recettesDuMois ?? 0)"
            style="margin-bottom: 16px"
          />
          <a-statistic title="Factures en attente" :value="stats?.facturation.facturesEnAttente ?? 0" />
        </a-card>
      </a-col>
    </a-row>
  </a-spin>
</template>
