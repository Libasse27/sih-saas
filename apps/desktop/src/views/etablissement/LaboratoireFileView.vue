<script setup lang="ts">
import { DemandeStatut, Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import * as laboratoireService from '../../services/laboratoire.service';
import type { DemandeAnalyse } from '../../services/laboratoire.service';
import { obtenirSocket } from '../../services/realtime';
import { useAuthStore } from '../../stores/auth.store';

const auth = useAuthStore();
const peutEcrire = auth.aPermission(Permission.LABO_RESULT_WRITE);
const peutValider = auth.aPermission(Permission.LABO_RESULT_VALIDATE);

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

const items = ref<DemandeAnalyse[]>([]);
const chargement = ref(false);
const filtreStatut = ref<DemandeStatut | undefined>(DemandeStatut.EN_ATTENTE);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const resultat = await laboratoireService.findFileDeTravail(1, 100, filtreStatut.value);
    items.value = resultat.items;
  } finally {
    chargement.value = false;
  }
}

function onResultatDisponible(payload: { demandeId: string }): void {
  message.info(`Un résultat est disponible pour la demande ${payload.demandeId.slice(0, 8)}…`);
  void charger();
}

// --- Écriture du résultat ---
const modalResultatOuvert = ref(false);
const demandeEnCours = ref<DemandeAnalyse | null>(null);
const enregistrement = ref(false);
const lignesResultat = ref<Array<{ cle: string; valeur: string }>>([{ cle: '', valeur: '' }]);
const valeursCritiques = ref(false);
const fichierUrl = ref('');

function ouvrirEcritureResultat(demande: DemandeAnalyse): void {
  demandeEnCours.value = demande;
  lignesResultat.value = [{ cle: '', valeur: '' }];
  valeursCritiques.value = false;
  fichierUrl.value = '';
  modalResultatOuvert.value = true;
}

function ajouterLigneResultat(): void {
  lignesResultat.value.push({ cle: '', valeur: '' });
}

async function soumettreResultat(): Promise<void> {
  if (!demandeEnCours.value) return;
  const resultats: Record<string, unknown> = {};
  for (const ligne of lignesResultat.value) {
    if (ligne.cle.trim()) resultats[ligne.cle.trim()] = ligne.valeur;
  }
  enregistrement.value = true;
  try {
    await laboratoireService.ecrireResultat(demandeEnCours.value.id, {
      resultats,
      valeursCritiques: valeursCritiques.value,
      fichierUrl: fichierUrl.value || undefined,
    });
    message.success('Résultat enregistré.');
    modalResultatOuvert.value = false;
    await charger();
  } finally {
    enregistrement.value = false;
  }
}

async function validerResultat(demande: DemandeAnalyse): Promise<void> {
  await laboratoireService.validerResultat(demande.id);
  message.success('Résultat validé — le prescripteur est notifié.');
  await charger();
}

onMounted(() => {
  void charger();
  obtenirSocket()?.on('labo:resultat.disponible', onResultatDisponible);
});

onUnmounted(() => {
  obtenirSocket()?.off('labo:resultat.disponible', onResultatDisponible);
});
</script>

<template>
  <div>
    <div class="entete">
      <h2>Laboratoire — file de travail</h2>
      <a-select v-model:value="filtreStatut" placeholder="Filtrer par statut" allow-clear style="width: 200px" @change="charger">
        <a-select-option v-for="statut in Object.values(DemandeStatut)" :key="statut" :value="statut">
          {{ LIBELLE_STATUT[statut] }}
        </a-select-option>
      </a-select>
    </div>

    <a-table :data-source="items" :loading="chargement" row-key="id" size="small">
      <a-table-column title="Type d’analyse" data-index="typeAnalyse" />
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
            <a-button v-if="peutEcrire && record.statut !== DemandeStatut.TERMINEE" size="small" @click="ouvrirEcritureResultat(record)">
              Écrire résultat
            </a-button>
            <a-button v-if="peutValider && record.statut === DemandeStatut.EN_COURS" size="small" type="primary" @click="validerResultat(record)">
              Valider
            </a-button>
          </a-space>
        </template>
      </a-table-column>
    </a-table>

    <a-modal v-model:open="modalResultatOuvert" title="Écrire le résultat" :confirm-loading="enregistrement" width="600" @ok="soumettreResultat">
      <div v-for="(ligne, index) in lignesResultat" :key="index" style="margin-bottom: 8px">
        <a-space>
          <a-input v-model:value="ligne.cle" placeholder="Paramètre (ex. Hémoglobine)" style="width: 220px" />
          <a-input v-model:value="ligne.valeur" placeholder="Valeur" style="width: 200px" />
        </a-space>
      </div>
      <a-button style="margin-bottom: 16px" @click="ajouterLigneResultat">Ajouter un paramètre</a-button>
      <a-form-item label="Valeurs critiques"><a-switch v-model:checked="valeursCritiques" /></a-form-item>
      <a-form-item label="URL du rapport (optionnel)"><a-input v-model:value="fichierUrl" /></a-form-item>
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
