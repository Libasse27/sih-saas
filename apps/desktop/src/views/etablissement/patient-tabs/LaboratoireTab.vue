<script setup lang="ts">
import { DemandeStatut, Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as laboratoireService from '../../../services/laboratoire.service';
import type { DemandeAnalyse } from '../../../services/laboratoire.service';
import { useAuthStore } from '../../../stores/auth.store';

const props = defineProps<{ patientId: string }>();

const auth = useAuthStore();
const peutDemander = auth.aPermission(Permission.LABO_REQUEST);

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
const chargement = ref(true);
const lectureRefusee = ref(false);

const modalOuvert = ref(false);
const enregistrement = ref(false);
const formulaire = reactive({ typeAnalyse: '', urgence: false });

async function charger(): Promise<void> {
  chargement.value = true;
  lectureRefusee.value = false;
  try {
    const resultat = await laboratoireService.findAllForPatient(props.patientId, 1, 50);
    items.value = resultat.items;
  } catch {
    lectureRefusee.value = true;
  } finally {
    chargement.value = false;
  }
}

function ouvrirCreation(): void {
  formulaire.typeAnalyse = '';
  formulaire.urgence = false;
  modalOuvert.value = true;
}

async function soumettre(): Promise<void> {
  enregistrement.value = true;
  try {
    await laboratoireService.create(props.patientId, formulaire);
    message.success('Demande d’analyse créée.');
    modalOuvert.value = false;
    await charger();
  } finally {
    enregistrement.value = false;
  }
}

onMounted(charger);
</script>

<template>
  <a-spin :spinning="chargement">
    <a-alert
      v-if="lectureRefusee"
      type="warning"
      show-icon
      message="Aucun lien de soin actif avec ce patient — demandes d’analyse non visibles."
      style="margin-bottom: 16px"
    />

    <template v-else>
      <div class="entete">
        <a-button v-if="peutDemander" type="primary" @click="ouvrirCreation">Nouvelle demande d’analyse</a-button>
      </div>

      <a-list :data-source="[...items].reverse()" :locale="{ emptyText: 'Aucune demande d’analyse.' }">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta :description="new Date(item.createdAt).toLocaleString('fr-SN')">
              <template #title>
                {{ item.typeAnalyse }}
                <a-tag v-if="item.urgence" color="red">Urgent</a-tag>
              </template>
            </a-list-item-meta>
            <a-tag :color="COULEUR_STATUT[item.statut as DemandeStatut]">{{ LIBELLE_STATUT[item.statut as DemandeStatut] }}</a-tag>
          </a-list-item>
        </template>
      </a-list>
    </template>

    <a-modal v-model:open="modalOuvert" title="Nouvelle demande d’analyse" :confirm-loading="enregistrement" @ok="soumettre">
      <a-form layout="vertical">
        <a-form-item label="Type d’analyse"><a-input v-model:value="formulaire.typeAnalyse" placeholder="NFS, glycémie..." /></a-form-item>
        <a-form-item label="Urgent"><a-switch v-model:checked="formulaire.urgence" /></a-form-item>
      </a-form>
    </a-modal>
  </a-spin>
</template>

<style scoped>
.entete {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}
</style>
