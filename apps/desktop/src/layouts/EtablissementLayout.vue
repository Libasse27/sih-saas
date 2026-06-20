<script setup lang="ts">
import {
  CalendarOutlined,
  DashboardOutlined,
  DollarOutlined,
  ExperimentOutlined,
  EyeOutlined,
  KeyOutlined,
  MedicineBoxOutlined,
  SafetyOutlined,
  ShopOutlined,
  SmileOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons-vue';
import { Permission, SubscriptionStatut } from '@sih-saas/shared';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as subscriptionsService from '../services/subscriptions.service';
import type { Subscription } from '../services/subscriptions.service';
import { useAuthStore } from '../stores/auth.store';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const abonnement = ref<Subscription | null>(null);
const chargementAbonnement = ref(true);

const STATUT_COULEUR: Record<SubscriptionStatut, string> = {
  [SubscriptionStatut.ESSAI]: 'blue',
  [SubscriptionStatut.ACTIF]: 'green',
  [SubscriptionStatut.EN_PERIODE_GRACE]: 'orange',
  [SubscriptionStatut.EXPIRE]: 'red',
  [SubscriptionStatut.SUSPENDU]: 'red',
  [SubscriptionStatut.ANNULE]: 'default',
  [SubscriptionStatut.EN_ATTENTE]: 'default',
};

/**
 * Modules support (Phase 12) — chacun gardé par sa propre permission, jamais par un forfait
 * (ClinicalModule), voir prompt maître §8. "Sécurité" (MFA) n'a volontairement aucune permission :
 * c'est un réglage du compte courant, accessible à tout utilisateur établissement connecté.
 */
const menuItems = computed(() => {
  const items: Array<{ key: string; label: string; icon: unknown }> = [
    { key: 'etablissement-dashboard', label: 'Tableau de bord', icon: DashboardOutlined },
  ];

  if (auth.aPermission(Permission.PATIENT_READ) || auth.aPermission(Permission.PATIENT_CREATE)) {
    items.push({ key: 'etablissement-patients', label: 'Patients', icon: TeamOutlined });
  }
  if (auth.aPermission(Permission.RDV_CREATE) || auth.aPermission(Permission.RDV_MANAGE)) {
    items.push({ key: 'etablissement-rendez-vous', label: 'Rendez-vous', icon: CalendarOutlined });
  }
  if (auth.aPermission(Permission.LIT_VIEW)) {
    items.push({ key: 'etablissement-lits', label: 'Lits', icon: MedicineBoxOutlined });
  }
  if (auth.aPermission(Permission.ADMISSION_CREATE)) {
    items.push({ key: 'etablissement-admissions', label: 'Admissions', icon: MedicineBoxOutlined });
  }
  if (auth.aPermission(Permission.STOCK_VIEW) || auth.aPermission(Permission.STOCK_MANAGE) || auth.aPermission(Permission.DISPENSATION_CREATE)) {
    items.push({ key: 'etablissement-pharmacie', label: 'Pharmacie', icon: ExperimentOutlined });
  }
  if (auth.aPermission(Permission.LABO_RESULT_WRITE) || auth.aPermission(Permission.LABO_RESULT_VALIDATE)) {
    items.push({ key: 'etablissement-laboratoire', label: 'Laboratoire', icon: ExperimentOutlined });
  }
  if (auth.aPermission(Permission.IMAGERIE_REPORT_WRITE) || auth.aPermission(Permission.IMAGERIE_REPORT_VALIDATE)) {
    items.push({ key: 'etablissement-imagerie', label: 'Imagerie', icon: EyeOutlined });
  }
  if (auth.aPermission(Permission.FACTURE_PATIENT_CREATE)) {
    items.push({ key: 'etablissement-facturation', label: 'Facturation', icon: DollarOutlined });
  }
  if (auth.aPermission(Permission.MAINTENANCE_MANAGE)) {
    items.push({ key: 'etablissement-maintenance', label: 'Maintenance', icon: ToolOutlined });
  }
  if (auth.aPermission(Permission.STERILISATION_MANAGE)) {
    items.push({ key: 'etablissement-sterilisation', label: 'Stérilisation', icon: ToolOutlined });
  }
  if (auth.aPermission(Permission.STOCK_VIEW) || auth.aPermission(Permission.STOCK_MANAGE)) {
    items.push({ key: 'etablissement-logistique', label: 'Logistique', icon: ShopOutlined });
  }
  if (auth.aPermission(Permission.SOCIAL_MANAGE) || auth.aPermission(Permission.DOSSIER_READ)) {
    items.push({ key: 'etablissement-social', label: 'Social', icon: SmileOutlined });
  }
  if (auth.aPermission(Permission.API_KEY_MANAGE)) {
    items.push({ key: 'etablissement-api-keys', label: 'Clés API', icon: KeyOutlined });
  }
  items.push({ key: 'etablissement-securite', label: 'Sécurité', icon: SafetyOutlined });

  return items;
});

const selectedKeys = computed<string[]>(() => {
  // La fiche détail d'un patient doit garder "Patients" sélectionné dans le menu.
  if (route.name === 'etablissement-patient-detail') {
    return ['etablissement-patients'];
  }
  return [String(route.name)];
});

function onMenuClick({ key }: { key: string }): void {
  void router.push({ name: key });
}

onMounted(async () => {
  try {
    // 403 possible si le rôle n'a pas `abonnement-etablissement:view` (ex. MEDECIN) — bandeau alors masqué, pas une erreur.
    abonnement.value = await subscriptionsService.findMine();
  } catch {
    abonnement.value = null;
  } finally {
    chargementAbonnement.value = false;
  }
});

async function seDeconnecter(): Promise<void> {
  await auth.logout();
  await router.push({ name: 'login' });
}
</script>

<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider>
      <div class="logo">SIH SaaS</div>
      <a-menu theme="dark" mode="inline" :selected-keys="selectedKeys" @click="onMenuClick">
        <a-menu-item v-for="item in menuItems" :key="item.key">
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="header">
        <span class="titre">Console établissement</span>
        <span class="utilisateur">
          {{ auth.nomComplet }}
          <a-button type="link" @click="seDeconnecter">Déconnexion</a-button>
        </span>
      </a-layout-header>

      <a-alert
        v-if="!chargementAbonnement && abonnement"
        class="bandeau"
        :type="abonnement.statut === SubscriptionStatut.ACTIF ? 'success' : 'warning'"
        show-icon
      >
        <template #message>
          Forfait <strong>{{ abonnement.planSnapshot.nom }}</strong>
          — <a-tag :color="STATUT_COULEUR[abonnement.statut]">{{ abonnement.statut }}</a-tag>
          — expire le {{ new Date(abonnement.dateFin).toLocaleDateString('fr-SN') }}
          <a-tooltip title="Renouvellement en ligne — bientôt disponible">
            <a-button size="small" disabled style="margin-left: 12px">Renouveler</a-button>
          </a-tooltip>
        </template>
      </a-alert>

      <a-layout-content class="contenu">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.logo {
  color: #fff;
  font-weight: 600;
  text-align: center;
  padding: 16px;
  font-size: 18px;
}
.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.titre {
  font-weight: 600;
  font-size: 16px;
}
.utilisateur {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bandeau {
  margin: 0;
  border-radius: 0;
}
.contenu {
  margin: 24px;
  padding: 24px;
  background: #fff;
  min-height: 280px;
}
</style>
