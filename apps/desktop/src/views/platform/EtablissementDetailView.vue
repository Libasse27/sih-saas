<script setup lang="ts">
import { EtablissementStatut, StatutAutorisationCdp, SubscriptionStatut } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import dayjs, { type Dayjs } from 'dayjs';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as etablissementsService from '../../services/etablissements.service';
import type { Etablissement } from '../../services/etablissements.service';
import * as subscriptionsService from '../../services/subscriptions.service';
import type { Subscription } from '../../services/subscriptions.service';

const LIBELLE_STATUT_CDP: Record<StatutAutorisationCdp, string> = {
  [StatutAutorisationCdp.NON_INITIEE]: 'Non initiée',
  [StatutAutorisationCdp.DEMANDE_SOUMISE]: 'Demande soumise',
  [StatutAutorisationCdp.AUTORISEE]: 'Autorisée',
  [StatutAutorisationCdp.REFUSEE]: 'Refusée',
  [StatutAutorisationCdp.RETIREE]: 'Retirée',
};

const COULEUR_STATUT_CDP: Record<StatutAutorisationCdp, string> = {
  [StatutAutorisationCdp.NON_INITIEE]: 'default',
  [StatutAutorisationCdp.DEMANDE_SOUMISE]: 'orange',
  [StatutAutorisationCdp.AUTORISEE]: 'green',
  [StatutAutorisationCdp.REFUSEE]: 'red',
  [StatutAutorisationCdp.RETIREE]: 'red',
};

const props = defineProps<{ id: string }>();
const router = useRouter();

const etablissement = ref<Etablissement | null>(null);
const abonnement = ref<Subscription | null>(null);
const chargement = ref(true);
const joursProlongation = ref(30);
const nouveauStatutAbonnement = ref<SubscriptionStatut | undefined>(undefined);

const formCdp = reactive<{
  statut: StatutAutorisationCdp;
  numeroRecepisse: string;
  dateDemande: Dayjs | null;
  dateDecision: Dayjs | null;
  commentaire: string;
}>({
  statut: StatutAutorisationCdp.NON_INITIEE,
  numeroRecepisse: '',
  dateDemande: null,
  dateDecision: null,
  commentaire: '',
});
const enregistrementCdp = ref(false);

function reinitialiserFormCdp(etab: Etablissement): void {
  formCdp.statut = etab.statutCdp;
  formCdp.numeroRecepisse = etab.numeroRecepisseCdp ?? '';
  formCdp.dateDemande = etab.dateDemandeCdp ? dayjs(etab.dateDemandeCdp) : null;
  formCdp.dateDecision = etab.dateDecisionCdp ? dayjs(etab.dateDecisionCdp) : null;
  formCdp.commentaire = etab.commentaireCdp ?? '';
}

async function enregistrerCdp(): Promise<void> {
  if (!etablissement.value) return;
  enregistrementCdp.value = true;
  try {
    etablissement.value = await etablissementsService.updateCdp(etablissement.value.id, {
      statut: formCdp.statut,
      numeroRecepisse: formCdp.numeroRecepisse.trim() || undefined,
      dateDemande: formCdp.dateDemande?.format('YYYY-MM-DD'),
      dateDecision: formCdp.dateDecision?.format('YYYY-MM-DD'),
      commentaire: formCdp.commentaire.trim() || undefined,
    });
    message.success('Dossier CDP mis à jour.');
  } finally {
    enregistrementCdp.value = false;
  }
}

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const [etab, sub] = await Promise.all([
      etablissementsService.findById(props.id),
      subscriptionsService.findActiveForEtablissement(props.id),
    ]);
    etablissement.value = etab;
    abonnement.value = sub;
    reinitialiserFormCdp(etab);
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

      <a-card v-if="etablissement" title="Autorisation CDP" style="margin-top: 16px">
        <a-alert
          type="info"
          show-icon
          message="Suivi du dossier d'autorisation de la Commission de Protection des Données Personnelles (loi sénégalaise n°2008-12) — visibilité uniquement, ne bloque aucune action sur l'établissement."
          style="margin-bottom: 16px"
        />

        <a-descriptions :column="2" bordered style="margin-bottom: 16px">
          <a-descriptions-item label="Statut">
            <a-tag :color="COULEUR_STATUT_CDP[etablissement.statutCdp]">{{ LIBELLE_STATUT_CDP[etablissement.statutCdp] }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="Numéro de récépissé">{{ etablissement.numeroRecepisseCdp ?? '—' }}</a-descriptions-item>
          <a-descriptions-item label="Date de demande">
            {{ etablissement.dateDemandeCdp ? new Date(etablissement.dateDemandeCdp).toLocaleDateString('fr-SN') : '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="Date de décision">
            {{ etablissement.dateDecisionCdp ? new Date(etablissement.dateDecisionCdp).toLocaleDateString('fr-SN') : '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="Commentaire" :span="2">{{ etablissement.commentaireCdp ?? '—' }}</a-descriptions-item>
        </a-descriptions>

        <a-form layout="vertical" @finish="enregistrerCdp">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="Statut">
                <a-select v-model:value="formCdp.statut">
                  <a-select-option v-for="statut in Object.values(StatutAutorisationCdp)" :key="statut" :value="statut">
                    {{ LIBELLE_STATUT_CDP[statut] }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="Numéro de récépissé">
                <a-input v-model:value="formCdp.numeroRecepisse" />
              </a-form-item>
            </a-col>
            <a-col :span="8" />
            <a-col :span="8">
              <a-form-item label="Date de demande">
                <a-date-picker v-model:value="formCdp.dateDemande" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="Date de décision">
                <a-date-picker v-model:value="formCdp.dateDecision" style="width: 100%" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="Commentaire">
            <a-textarea v-model:value="formCdp.commentaire" :rows="2" />
          </a-form-item>
          <a-button type="primary" html-type="submit" :loading="enregistrementCdp">Enregistrer</a-button>
        </a-form>
      </a-card>
    </a-spin>
  </div>
</template>
