<script setup lang="ts">
import { SubscriptionStatut } from '@sih-saas/shared';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as subscriptionsService from '../services/subscriptions.service';
import type { Subscription } from '../services/subscriptions.service';
import { useAuthStore } from '../stores/auth.store';

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
    <a-layout-header class="header">
      <span class="titre">SIH SaaS — Console établissement</span>
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
</template>

<style scoped>
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
