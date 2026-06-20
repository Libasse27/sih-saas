<script setup lang="ts">
import { Permission, Sexe } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { ref } from 'vue';
import * as socialService from '../../services/social.service';
import type { NoteSociale, PatientResume } from '../../services/social.service';
import { useAuthStore } from '../../stores/auth.store';

const auth = useAuthStore();
const peutEcrire = auth.aPermission(Permission.SOCIAL_MANAGE);

const idhRecherche = ref('');
const recherchEnCours = ref(false);
const patientCourant = ref<PatientResume | null>(null);
const patientIntrouvable = ref(false);

const notes = ref<NoteSociale[]>([]);
const chargementNotes = ref(false);
/** Le lien de soin (CareContextGuard) peut manquer même si la note a déjà été créée — voir SocialController. */
const lectureRefusee = ref(false);

const nouvelleNote = ref('');
const enregistrement = ref(false);

async function rechercher(): Promise<void> {
  if (!idhRecherche.value.trim()) return;

  recherchEnCours.value = true;
  patientIntrouvable.value = false;
  patientCourant.value = null;
  notes.value = [];
  lectureRefusee.value = false;

  try {
    patientCourant.value = await socialService.rechercherParIdh(idhRecherche.value.trim());
    await chargerNotes(patientCourant.value.id);
  } catch {
    patientIntrouvable.value = true;
  } finally {
    recherchEnCours.value = false;
  }
}

async function chargerNotes(patientId: string): Promise<void> {
  chargementNotes.value = true;
  lectureRefusee.value = false;
  try {
    notes.value = await socialService.findAllNotes(patientId);
  } catch {
    // 403 plausible : aucun lien de soin actif (CareContextGuard) — l'écriture reste possible.
    lectureRefusee.value = true;
  } finally {
    chargementNotes.value = false;
  }
}

async function ajouterNote(): Promise<void> {
  if (!patientCourant.value || !nouvelleNote.value.trim()) return;

  enregistrement.value = true;
  try {
    await socialService.createNote(patientCourant.value.id, nouvelleNote.value.trim());
    message.success('Note sociale enregistrée.');
    nouvelleNote.value = '';
    await chargerNotes(patientCourant.value.id);
  } finally {
    enregistrement.value = false;
  }
}
</script>

<template>
  <div>
    <h2>Social</h2>

    <a-input-search
      v-model:value="idhRecherche"
      placeholder="Rechercher un patient par IDH"
      enter-button="Rechercher"
      :loading="recherchEnCours"
      style="max-width: 420px; margin-bottom: 24px"
      @search="rechercher"
    />

    <a-alert v-if="patientIntrouvable" type="error" message="Aucun patient ne correspond à cet IDH." show-icon style="margin-bottom: 16px" />

    <template v-if="patientCourant">
      <a-descriptions bordered :column="2" size="small" style="margin-bottom: 24px">
        <a-descriptions-item label="IDH">{{ patientCourant.idh }}</a-descriptions-item>
        <a-descriptions-item label="Nom">{{ patientCourant.prenom }} {{ patientCourant.nom }}</a-descriptions-item>
        <a-descriptions-item label="Date de naissance">{{ new Date(patientCourant.dateNaissance).toLocaleDateString('fr-SN') }}</a-descriptions-item>
        <a-descriptions-item label="Sexe">{{ patientCourant.sexe === Sexe.M ? 'Masculin' : 'Féminin' }}</a-descriptions-item>
      </a-descriptions>

      <a-card title="Notes sociales" :loading="chargementNotes">
        <a-alert
          v-if="lectureRefusee"
          type="warning"
          message="Aucun lien de soin actif avec ce patient — historique des notes non visible, mais vous pouvez en ajouter une."
          show-icon
          style="margin-bottom: 16px"
        />
        <a-list v-else :data-source="notes" :locale="{ emptyText: 'Aucune note sociale pour ce patient.' }">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta :description="new Date(item.createdAt).toLocaleString('fr-SN')">
                <template #title>{{ item.contenu }}</template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>

        <a-divider v-if="peutEcrire" />
        <template v-if="peutEcrire">
          <a-textarea v-model:value="nouvelleNote" :rows="3" placeholder="Nouvelle note sociale..." />
          <a-button type="primary" :loading="enregistrement" style="margin-top: 12px" @click="ajouterNote">
            Ajouter la note
          </a-button>
        </template>
      </a-card>
    </template>
  </div>
</template>
