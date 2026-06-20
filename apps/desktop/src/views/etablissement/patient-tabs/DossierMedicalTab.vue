<script setup lang="ts">
import { Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as dossierMedicalService from '../../../services/dossier-medical.service';
import type { DossierMedical } from '../../../services/dossier-medical.service';
import { useAuthStore } from '../../../stores/auth.store';

const props = defineProps<{ patientId: string }>();

const auth = useAuthStore();
const peutEcrire = auth.aPermission(Permission.DOSSIER_WRITE);

const dossier = ref<DossierMedical | null>(null);
const chargement = ref(true);
const lectureRefusee = ref(false);

const antecedentsEdition = reactive({
  medicaux: [] as string[],
  chirurgicaux: [] as string[],
  familiaux: [] as string[],
});
const nouvelleAllergie = reactive({ substance: '', severite: '' });
const allergiesEdition = ref<dossierMedicalService.Allergie[]>([]);
const enregistrementAntecedents = ref(false);

const nouvelleObservation = reactive({ contenu: '', type: 'consultation' });
const enregistrementObservation = ref(false);

const nouveauCompteRendu = reactive({ contenu: '', type: 'consultation', fichierUrl: '' });
const enregistrementCompteRendu = ref(false);

async function charger(): Promise<void> {
  chargement.value = true;
  lectureRefusee.value = false;
  try {
    dossier.value = await dossierMedicalService.findDossier(props.patientId);
    antecedentsEdition.medicaux = [...dossier.value.antecedents.medicaux];
    antecedentsEdition.chirurgicaux = [...dossier.value.antecedents.chirurgicaux];
    antecedentsEdition.familiaux = [...dossier.value.antecedents.familiaux];
    allergiesEdition.value = [...dossier.value.antecedents.allergies];
  } catch {
    // 403 plausible : aucun lien de soin actif avec ce patient (CareContextGuard).
    lectureRefusee.value = true;
  } finally {
    chargement.value = false;
  }
}

function ajouterAllergie(): void {
  if (!nouvelleAllergie.substance.trim()) return;
  allergiesEdition.value.push({ substance: nouvelleAllergie.substance.trim(), severite: nouvelleAllergie.severite || undefined });
  nouvelleAllergie.substance = '';
  nouvelleAllergie.severite = '';
}

function retirerAllergie(index: number): void {
  allergiesEdition.value.splice(index, 1);
}

async function enregistrerAntecedents(): Promise<void> {
  enregistrementAntecedents.value = true;
  try {
    dossier.value = await dossierMedicalService.mettreAJourAntecedents(props.patientId, {
      medicaux: antecedentsEdition.medicaux,
      chirurgicaux: antecedentsEdition.chirurgicaux,
      familiaux: antecedentsEdition.familiaux,
      allergies: allergiesEdition.value,
    });
    message.success('Antécédents mis à jour.');
  } finally {
    enregistrementAntecedents.value = false;
  }
}

async function ajouterObservation(): Promise<void> {
  if (!nouvelleObservation.contenu.trim()) return;
  enregistrementObservation.value = true;
  try {
    dossier.value = await dossierMedicalService.ajouterObservation(props.patientId, nouvelleObservation.contenu.trim(), nouvelleObservation.type);
    nouvelleObservation.contenu = '';
    message.success('Observation ajoutée.');
  } finally {
    enregistrementObservation.value = false;
  }
}

async function ajouterCompteRendu(): Promise<void> {
  if (!nouveauCompteRendu.contenu.trim()) return;
  enregistrementCompteRendu.value = true;
  try {
    dossier.value = await dossierMedicalService.ajouterCompteRendu(props.patientId, {
      contenu: nouveauCompteRendu.contenu.trim(),
      type: nouveauCompteRendu.type,
      fichierUrl: nouveauCompteRendu.fichierUrl || undefined,
    });
    nouveauCompteRendu.contenu = '';
    nouveauCompteRendu.fichierUrl = '';
    message.success('Compte-rendu ajouté.');
  } finally {
    enregistrementCompteRendu.value = false;
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
      message="Aucun lien de soin actif avec ce patient — accès au dossier médical refusé."
      style="margin-bottom: 16px"
    />

    <template v-else-if="dossier">
      <a-card title="Antécédents et allergies" style="margin-bottom: 16px">
        <a-form layout="vertical">
          <a-form-item label="Antécédents médicaux">
            <a-select v-model:value="antecedentsEdition.medicaux" mode="tags" :disabled="!peutEcrire" style="width: 100%" placeholder="Saisir puis Entrée" />
          </a-form-item>
          <a-form-item label="Antécédents chirurgicaux">
            <a-select v-model:value="antecedentsEdition.chirurgicaux" mode="tags" :disabled="!peutEcrire" style="width: 100%" placeholder="Saisir puis Entrée" />
          </a-form-item>
          <a-form-item label="Antécédents familiaux">
            <a-select v-model:value="antecedentsEdition.familiaux" mode="tags" :disabled="!peutEcrire" style="width: 100%" placeholder="Saisir puis Entrée" />
          </a-form-item>

          <a-form-item label="Allergies">
            <a-space v-for="(allergie, index) in allergiesEdition" :key="index" style="display: flex; margin-bottom: 8px">
              <a-tag color="red">{{ allergie.substance }}<template v-if="allergie.severite"> — {{ allergie.severite }}</template></a-tag>
              <a-button v-if="peutEcrire" size="small" danger @click="retirerAllergie(index)">Retirer</a-button>
            </a-space>
            <a-space v-if="peutEcrire">
              <a-input v-model:value="nouvelleAllergie.substance" placeholder="Substance (ex. Pénicilline)" />
              <a-input v-model:value="nouvelleAllergie.severite" placeholder="Sévérité (optionnel)" />
              <a-button @click="ajouterAllergie">Ajouter</a-button>
            </a-space>
          </a-form-item>

          <a-button v-if="peutEcrire" type="primary" :loading="enregistrementAntecedents" @click="enregistrerAntecedents">
            Enregistrer les antécédents
          </a-button>
        </a-form>
      </a-card>

      <a-card title="Observations" style="margin-bottom: 16px">
        <a-list :data-source="[...dossier.observations].reverse()" :locale="{ emptyText: 'Aucune observation.' }">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta :description="`${item.type} — ${new Date(item.date).toLocaleString('fr-SN')}`">
                <template #title>{{ item.contenu }}</template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>

        <a-divider v-if="peutEcrire" />
        <template v-if="peutEcrire">
          <a-textarea v-model:value="nouvelleObservation.contenu" :rows="2" placeholder="Nouvelle observation..." />
          <a-space style="margin-top: 8px">
            <a-select v-model:value="nouvelleObservation.type" style="width: 160px">
              <a-select-option value="consultation">Consultation</a-select-option>
              <a-select-option value="visite">Visite</a-select-option>
              <a-select-option value="suivi">Suivi</a-select-option>
            </a-select>
            <a-button type="primary" :loading="enregistrementObservation" @click="ajouterObservation">Ajouter</a-button>
          </a-space>
        </template>
      </a-card>

      <a-card title="Comptes-rendus">
        <a-list :data-source="[...dossier.comptesRendus].reverse()" :locale="{ emptyText: 'Aucun compte-rendu.' }">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta :description="`${item.type} — ${new Date(item.date).toLocaleString('fr-SN')}`">
                <template #title>
                  {{ item.contenu }}
                  <a v-if="item.fichierUrl" :href="item.fichierUrl" target="_blank" style="margin-left: 8px">Pièce jointe</a>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>

        <a-divider v-if="peutEcrire" />
        <template v-if="peutEcrire">
          <a-textarea v-model:value="nouveauCompteRendu.contenu" :rows="2" placeholder="Contenu du compte-rendu..." />
          <a-space style="margin-top: 8px">
            <a-input v-model:value="nouveauCompteRendu.type" placeholder="Type (ex. opératoire)" style="width: 200px" />
            <a-input v-model:value="nouveauCompteRendu.fichierUrl" placeholder="URL pièce jointe (optionnel)" style="width: 240px" />
            <a-button type="primary" :loading="enregistrementCompteRendu" @click="ajouterCompteRendu">Ajouter</a-button>
          </a-space>
        </template>
      </a-card>
    </template>
  </a-spin>
</template>
