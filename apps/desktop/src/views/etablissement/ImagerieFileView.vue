<script setup lang="ts">
import { DemandeStatut, Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import * as imagerieService from '../../services/imagerie.service';
import type { DemandeImagerie } from '../../services/imagerie.service';
import { obtenirSocket } from '../../services/realtime';
import { useAuthStore } from '../../stores/auth.store';

const auth = useAuthStore();
const peutEcrire = auth.aPermission(Permission.IMAGERIE_REPORT_WRITE);
const peutValider = auth.aPermission(Permission.IMAGERIE_REPORT_VALIDATE);

const LIBELLE_STATUT: Record<DemandeStatut, string> = {
  [DemandeStatut.EN_ATTENTE]: 'En attente',
  [DemandeStatut.EN_COURS]: 'En cours',
  [DemandeStatut.TERMINEE]: 'Terminée',
  [DemandeStatut.ANNULEE]: 'Annulée',
};

const COULEUR_STATUT: Record<DemandeStatut, string> = {
  [DemandeStatut.EN_ATTENTE]: 'orange',
  [DemandeStatut.EN_COURS]: 'blue',
  [DemandeStatut.TERMINEE]: 'green',
  [DemandeStatut.ANNULEE]: 'default',
};

const items = ref<DemandeImagerie[]>([]);
const chargement = ref(false);
const filtreStatut = ref<DemandeStatut | undefined>(DemandeStatut.EN_ATTENTE);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const resultat = await imagerieService.findFileDeTravail(1, 100, filtreStatut.value);
    items.value = resultat.items;
  } finally {
    chargement.value = false;
  }
}

function onRapportDisponible(payload: { demandeId: string }): void {
  message.info(`Un compte-rendu est disponible pour la demande ${payload.demandeId.slice(0, 8)}…`);
  void charger();
}

// --- Écriture du compte-rendu ---
const modalCompteRenduOuvert = ref(false);
const demandeEnCours = ref<DemandeImagerie | null>(null);
const enregistrement = ref(false);
const formulaire = reactive({ fichierDicomUrl: '', conclusion: '' });

function ouvrirEcritureCompteRendu(demande: DemandeImagerie): void {
  demandeEnCours.value = demande;
  formulaire.fichierDicomUrl = '';
  formulaire.conclusion = '';
  modalCompteRenduOuvert.value = true;
}

async function soumettreCompteRendu(): Promise<void> {
  if (!demandeEnCours.value) return;
  enregistrement.value = true;
  try {
    await imagerieService.ecrireCompteRendu(demandeEnCours.value.id, {
      fichierDicomUrl: formulaire.fichierDicomUrl || undefined,
      conclusion: formulaire.conclusion || undefined,
    });
    message.success('Compte-rendu enregistré.');
    modalCompteRenduOuvert.value = false;
    await charger();
  } finally {
    enregistrement.value = false;
  }
}

async function validerCompteRendu(demande: DemandeImagerie): Promise<void> {
  await imagerieService.validerCompteRendu(demande.id);
  message.success('Compte-rendu validé — le prescripteur est notifié.');
  await charger();
}

onMounted(() => {
  void charger();
  obtenirSocket()?.on('imagerie:rapport.disponible', onRapportDisponible);
});

onUnmounted(() => {
  obtenirSocket()?.off('imagerie:rapport.disponible', onRapportDisponible);
});
</script>

<template>
  <div>
    <div class="entete">
      <h2>Imagerie — file de travail</h2>
      <a-select v-model:value="filtreStatut" placeholder="Filtrer par statut" allow-clear style="width: 200px" @change="charger">
        <a-select-option v-for="statut in Object.values(DemandeStatut)" :key="statut" :value="statut">
          {{ LIBELLE_STATUT[statut] }}
        </a-select-option>
      </a-select>
    </div>

    <a-table :data-source="items" :loading="chargement" row-key="id" size="small">
      <a-table-column title="Type d’examen" data-index="typeExamen" />
      <a-table-column title="Urgent">
        <template #default="{ record }"><a-tag v-if="record.urgence" color="red">Urgent</a-tag></template>
      </a-table-column>
      <a-table-column title="Statut">
        <template #default="{ record }">
          <a-tag :color="COULEUR_STATUT[record.statut as DemandeStatut]">{{ LIBELLE_STATUT[record.statut as DemandeStatut] }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column title="Actions">
        <template #default="{ record }">
          <a-space>
            <a-button v-if="peutEcrire && record.statut !== DemandeStatut.TERMINEE" size="small" @click="ouvrirEcritureCompteRendu(record)">
              Écrire compte-rendu
            </a-button>
            <a-button v-if="peutValider && record.statut === DemandeStatut.EN_COURS" size="small" type="primary" @click="validerCompteRendu(record)">
              Valider
            </a-button>
          </a-space>
        </template>
      </a-table-column>
    </a-table>

    <a-modal v-model:open="modalCompteRenduOuvert" title="Écrire le compte-rendu" :confirm-loading="enregistrement" width="600" @ok="soumettreCompteRendu">
      <a-form layout="vertical">
        <a-form-item label="URL du fichier DICOM (optionnel)"><a-input v-model:value="formulaire.fichierDicomUrl" /></a-form-item>
        <a-form-item label="Conclusion"><a-textarea v-model:value="formulaire.conclusion" :rows="4" /></a-form-item>
      </a-form>
    </a-modal>
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
