<script setup lang="ts">
import { StatutAutorisationCdp } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import dayjs, { type Dayjs } from 'dayjs';
import { onMounted, reactive, ref } from 'vue';
import * as etablissementsService from '../../services/etablissements.service';
import type { Etablissement } from '../../services/etablissements.service';

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

const etablissement = ref<Etablissement | null>(null);
const chargement = ref(true);
const enregistrement = ref(false);

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

function reinitialiserFormCdp(etab: Etablissement): void {
  formCdp.statut = etab.statutCdp;
  formCdp.numeroRecepisse = etab.numeroRecepisseCdp ?? '';
  formCdp.dateDemande = etab.dateDemandeCdp ? dayjs(etab.dateDemandeCdp) : null;
  formCdp.dateDecision = etab.dateDecisionCdp ? dayjs(etab.dateDecisionCdp) : null;
  formCdp.commentaire = etab.commentaireCdp ?? '';
}

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    etablissement.value = await etablissementsService.findMyCdp();
    reinitialiserFormCdp(etablissement.value);
  } finally {
    chargement.value = false;
  }
}

async function enregistrer(): Promise<void> {
  enregistrement.value = true;
  try {
    etablissement.value = await etablissementsService.updateMyCdp({
      statut: formCdp.statut,
      numeroRecepisse: formCdp.numeroRecepisse.trim() || undefined,
      dateDemande: formCdp.dateDemande?.format('YYYY-MM-DD'),
      dateDecision: formCdp.dateDecision?.format('YYYY-MM-DD'),
      commentaire: formCdp.commentaire.trim() || undefined,
    });
    message.success('Dossier CDP mis à jour.');
  } finally {
    enregistrement.value = false;
  }
}

onMounted(charger);
</script>

<template>
  <div>
    <h2>Conformité</h2>

    <a-card title="Autorisation CDP" :loading="chargement" style="max-width: 720px">
      <a-alert
        type="info"
        show-icon
        message="La loi sénégalaise (n°2008-12) exige une autorisation préalable de la Commission de Protection des Données Personnelles pour traiter des données de santé. Tenez ce dossier à jour au fil de votre démarche — ce suivi est déclaratif, il n'est vérifié par aucune intégration automatique avec la CDP."
        style="margin-bottom: 16px"
      />

      <a-descriptions v-if="etablissement" :column="2" bordered style="margin-bottom: 16px">
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

      <a-form layout="vertical" @finish="enregistrer">
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
        <a-button type="primary" html-type="submit" :loading="enregistrement">Enregistrer</a-button>
      </a-form>
    </a-card>
  </div>
</template>
