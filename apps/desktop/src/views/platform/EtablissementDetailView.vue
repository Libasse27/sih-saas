<script setup lang="ts">
import { EtablissementStatut, SubscriptionStatut } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as etablissementsService from '../../services/etablissements.service';
import type { Etablissement } from '../../services/etablissements.service';
import * as subscriptionsService from '../../services/subscriptions.service';
import type { Subscription } from '../../services/subscriptions.service';

const props = defineProps<{ id: string }>();
const router = useRouter();

const etablissement = ref<Etablissement | null>(null);
const abonnement = ref<Subscription | null>(null);
const chargement = ref(true);
const joursProlongation = ref(30);
const nouveauStatutAbonnement = ref<SubscriptionStatut | undefined>(undefined);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const [etab, sub] = await Promise.all([
      etablissementsService.findById(props.id),
      subscriptionsService.findActiveForEtablissement(props.id),
    ]);
    etablissement.value = etab;
    abonnement.value = sub;
  } finally {
    chargement.value = false;
  }
}

async function basculerStatutEtablissement(): Promise<void> {
  if (!etablissement.value) return;
  const nouveauStatut =
    etablissement.value.statut === EtablissementStatut.SUSPENDU ? EtablissementStatut.ACTIF : EtablissementStatut.SUSPENDU;
  etablissement.value = await etablissementsService.updateStatut(etablissement.value.id, nouveauStatut);
  message.success('Statut mis à jour.');
}

async function prolonger(): Promise<void> {
  if (!abonnement.value) return;
  abonnement.value = await subscriptionsService.extend(abonnement.value.id, joursProlongation.value);
  message.success(`Abonnement prolongé de ${joursProlongation.value} jour(s).`);
}

async function migrerPlan(): Promise<void> {
  if (!abonnement.value) return;
  abonnement.value = await subscriptionsService.migratePlan(abonnement.value.id);
  message.success('Abonnement migré vers la dernière version du forfait.');
}

async function changerStatutAbonnement(): Promise<void> {
  if (!abonnement.value || !nouveauStatutAbonnement.value) return;
  abonnement.value = await subscriptionsService.updateStatut(abonnement.value.id, nouveauStatutAbonnement.value);
  message.success('Statut de l’abonnement mis à jour.');
}

onMounted(charger);
</script>

<template>
  <div>
    <a-button style="margin-bottom: 16px" @click="router.push({ name: 'platform-etablissements' })">← Retour</a-button>

    <a-spin :spinning="chargement">
      <a-card v-if="etablissement" title="Informations établissement" style="margin-bottom: 16px">
        <template #extra>
          <a-popconfirm
            :title="etablissement.statut === EtablissementStatut.SUSPENDU ? 'Réactiver cet établissement ?' : 'Suspendre cet établissement ?'"
            @confirm="basculerStatutEtablissement"
          >
            <a-button :danger="etablissement.statut !== EtablissementStatut.SUSPENDU">
              {{ etablissement.statut === EtablissementStatut.SUSPENDU ? 'Réactiver' : 'Suspendre' }}
            </a-button>
          </a-popconfirm>
        </template>
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="Code">{{ etablissement.code }}</a-descriptions-item>
          <a-descriptions-item label="Nom">{{ etablissement.nom }}</a-descriptions-item>
          <a-descriptions-item label="Type">{{ etablissement.type }}</a-descriptions-item>
          <a-descriptions-item label="Statut">{{ etablissement.statut }}</a-descriptions-item>
          <a-descriptions-item label="Ville">{{ etablissement.ville ?? '—' }}</a-descriptions-item>
          <a-descriptions-item label="Téléphone">{{ etablissement.telephone ?? '—' }}</a-descriptions-item>
          <a-descriptions-item label="Email">{{ etablissement.email ?? '—' }}</a-descriptions-item>
          <a-descriptions-item label="RCCM / NINEA">{{ etablissement.rccm ?? '—' }} / {{ etablissement.ninea ?? '—' }}</a-descriptions-item>
          <a-descriptions-item label="Utilisateurs">{{ etablissement.usage.utilisateurs }}</a-descriptions-item>
          <a-descriptions-item label="Lits">{{ etablissement.usage.lits }}</a-descriptions-item>
          <a-descriptions-item label="Stockage (Mo)">{{ etablissement.usage.stockageMo }}</a-descriptions-item>
          <a-descriptions-item label="Créé le">{{ new Date(etablissement.createdAt).toLocaleDateString('fr-SN') }}</a-descriptions-item>
        </a-descriptions>
        <!-- Le nom/email de l'administrateur n'est pas affiché : GET /users/:id exige `utilisateur:manage`,
             permission que SUPER_ADMIN ne possède pas par conception RBAC (aucun accès administratif
             d'établissement pour la plateforme) — voir plan Phase 9. -->
      </a-card>

      <a-card title="Abonnement">
        <a-empty v-if="!abonnement" description="Aucun abonnement actif pour cet établissement." />
        <template v-else>
          <a-descriptions :column="2" bordered style="margin-bottom: 16px">
            <a-descriptions-item label="Forfait">{{ abonnement.planSnapshot.nom }}</a-descriptions-item>
            <a-descriptions-item label="Statut">{{ abonnement.statut }}</a-descriptions-item>
            <a-descriptions-item label="Périodicité">{{ abonnement.periodicite }}</a-descriptions-item>
            <a-descriptions-item label="Montant">{{ abonnement.montant }} {{ abonnement.devise }}</a-descriptions-item>
            <a-descriptions-item label="Début">{{ new Date(abonnement.dateDebut).toLocaleDateString('fr-SN') }}</a-descriptions-item>
            <a-descriptions-item label="Fin">{{ new Date(abonnement.dateFin).toLocaleDateString('fr-SN') }}</a-descriptions-item>
            <a-descriptions-item label="Renouvellement auto">{{ abonnement.renouvellementAuto ? 'Oui' : 'Non' }}</a-descriptions-item>
            <a-descriptions-item label="Version du forfait">{{ abonnement.planSnapshot.version }}</a-descriptions-item>
          </a-descriptions>

          <a-space wrap>
            <a-input-number v-model:value="joursProlongation" :min="1" addon-before="Jours" />
            <a-button @click="prolonger">Prolonger</a-button>
            <a-button @click="migrerPlan">Migrer vers la dernière version du forfait</a-button>
            <a-select v-model:value="nouveauStatutAbonnement" placeholder="Nouveau statut" style="width: 200px">
              <a-select-option v-for="statut in Object.values(SubscriptionStatut)" :key="statut" :value="statut">
                {{ statut }}
              </a-select-option>
            </a-select>
            <a-button :disabled="!nouveauStatutAbonnement" @click="changerStatutAbonnement">Appliquer le statut</a-button>
          </a-space>
        </template>
      </a-card>
    </a-spin>
  </div>
</template>
