<script setup lang="ts">
import { AdministrationStatut, Permission, PrescriptionStatut } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as pharmacieService from '../../../services/pharmacie.service';
import type { AdministrationMedicament } from '../../../services/pharmacie.service';
import * as prescriptionsService from '../../../services/prescriptions.service';
import { useAuthStore } from '../../../stores/auth.store';

const props = defineProps<{ patientId: string }>();

const auth = useAuthStore();
const peutAdministrer = auth.aPermission(Permission.ADMINISTRATION_CREATE);

const LIBELLE_STATUT: Record<AdministrationStatut, string> = {
  [AdministrationStatut.ADMINISTRE]: 'Administré',
  [AdministrationStatut.REFUSE]: 'Refusé',
  [AdministrationStatut.OMIS]: 'Omis',
};

const COULEUR_STATUT: Record<AdministrationStatut, string> = {
  [AdministrationStatut.ADMINISTRE]: 'green',
  [AdministrationStatut.REFUSE]: 'red',
  [AdministrationStatut.OMIS]: 'orange',
};

interface LigneAAdministrer {
  prescriptionLigneId: string;
  libelle: string;
}

const items = ref<AdministrationMedicament[]>([]);
const lignesDisponibles = ref<LigneAAdministrer[]>([]);
const chargement = ref(true);
const lectureRefusee = ref(false);

async function charger(): Promise<void> {
  chargement.value = true;
  lectureRefusee.value = false;
  try {
    const [resultatAdministrations, resultatPrescriptions, resultatCatalogue] = await Promise.all([
      pharmacieService.findAdministrations(props.patientId, 1, 50),
      prescriptionsService.findAll(props.patientId, 1, 50),
      pharmacieService.findCatalogue(1, 200),
    ]);
    items.value = resultatAdministrations.items;

    const prescriptionsActives = resultatPrescriptions.items.filter(
      (p) => p.statut === PrescriptionStatut.VALIDEE || p.statut === PrescriptionStatut.DISPENSEE,
    );
    const details = await Promise.all(prescriptionsActives.map((p) => prescriptionsService.findOne(props.patientId, p.id)));
    lignesDisponibles.value = details.flatMap((d) =>
      d.lignes.map((ligne) => {
        const medicament = resultatCatalogue.items.find((m) => m.id === ligne.medicamentId);
        return {
          prescriptionLigneId: ligne.id,
          libelle: `${medicament ? `${medicament.dci} ${medicament.dosage}` : ligne.medicamentId} — ${ligne.posologie}`,
        };
      }),
    );
  } catch {
    lectureRefusee.value = true;
  } finally {
    chargement.value = false;
  }
}

const modalOuvert = ref(false);
const enregistrement = ref(false);
const formulaire = reactive({ prescriptionLigneId: undefined as string | undefined, statut: AdministrationStatut.ADMINISTRE, commentaire: '' });

function ouvrirCreation(): void {
  formulaire.prescriptionLigneId = undefined;
  formulaire.statut = AdministrationStatut.ADMINISTRE;
  formulaire.commentaire = '';
  modalOuvert.value = true;
}

async function soumettre(): Promise<void> {
  if (!formulaire.prescriptionLigneId) return;
  enregistrement.value = true;
  try {
    await pharmacieService.createAdministration(props.patientId, {
      prescriptionLigneId: formulaire.prescriptionLigneId,
      statut: formulaire.statut,
      commentaire: formulaire.commentaire || undefined,
    });
    message.success('Administration enregistrée.');
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
      message="Aucun lien de soin actif avec ce patient — administrations non visibles."
      style="margin-bottom: 16px"
    />

    <template v-else>
      <div class="entete">
        <a-button v-if="peutAdministrer" type="primary" :disabled="!lignesDisponibles.length" @click="ouvrirCreation">
          Enregistrer une administration
        </a-button>
      </div>

      <a-list :data-source="[...items].reverse()" :locale="{ emptyText: 'Aucune administration enregistrée.' }">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta :description="new Date(item.dateHeure).toLocaleString('fr-SN')">
              <template #title>
                <a-tag :color="COULEUR_STATUT[item.statut as AdministrationStatut]">{{ LIBELLE_STATUT[item.statut as AdministrationStatut] }}</a-tag>
                <span v-if="item.commentaire" style="margin-left: 8px">{{ item.commentaire }}</span>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </template>

    <a-modal v-model:open="modalOuvert" title="Enregistrer une administration" :confirm-loading="enregistrement" @ok="soumettre">
      <a-form layout="vertical">
        <a-form-item label="Ligne de prescription">
          <a-select v-model:value="formulaire.prescriptionLigneId">
            <a-select-option v-for="ligne in lignesDisponibles" :key="ligne.prescriptionLigneId" :value="ligne.prescriptionLigneId">
              {{ ligne.libelle }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Statut">
          <a-select v-model:value="formulaire.statut">
            <a-select-option v-for="statut in Object.values(AdministrationStatut)" :key="statut" :value="statut">
              {{ LIBELLE_STATUT[statut] }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Commentaire">
          <a-textarea v-model:value="formulaire.commentaire" :rows="2" />
        </a-form-item>
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
