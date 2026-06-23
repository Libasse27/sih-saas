<script setup lang="ts">
import { Permission, PrescriptionStatut } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as pharmacieService from '../../../services/pharmacie.service';
import type { MedicamentCatalogue, StockMedicament } from '../../../services/pharmacie.service';
import * as prescriptionsService from '../../../services/prescriptions.service';
import type { Prescription, PrescriptionAvecLignes } from '../../../services/prescriptions.service';
import { useAuthStore } from '../../../stores/auth.store';

const props = defineProps<{ patientId: string }>();

const auth = useAuthStore();
const peutPrescrire = auth.aPermission(Permission.PRESCRIPTION_CREATE);
const peutValider = auth.aPermission(Permission.PRESCRIPTION_VALIDATE);
const peutDispenser = auth.aPermission(Permission.DISPENSATION_CREATE);

const LIBELLE_STATUT: Record<PrescriptionStatut, string> = {
  [PrescriptionStatut.EN_ATTENTE]: 'En attente',
  [PrescriptionStatut.VALIDEE]: 'Validée',
  [PrescriptionStatut.DISPENSEE]: 'Dispensée',
  [PrescriptionStatut.ANNULEE]: 'Annulée',
};

const COULEUR_STATUT: Record<PrescriptionStatut, string> = {
  [PrescriptionStatut.EN_ATTENTE]: 'orange',
  [PrescriptionStatut.VALIDEE]: 'blue',
  [PrescriptionStatut.DISPENSEE]: 'green',
  [PrescriptionStatut.ANNULEE]: 'default',
};

const items = ref<Prescription[]>([]);
const chargement = ref(true);
const lectureRefusee = ref(false);
const catalogue = ref<MedicamentCatalogue[]>([]);

function nomMedicament(medicamentId: string): string {
  const medicament = catalogue.value.find((m) => m.id === medicamentId);
  return medicament ? `${medicament.dci} ${medicament.dosage} (${medicament.forme})` : medicamentId;
}

function rendreMedicamentDeLigne({ record }: { record: { medicamentId: string } }): string {
  return nomMedicament(record.medicamentId);
}

async function charger(): Promise<void> {
  chargement.value = true;
  lectureRefusee.value = false;
  try {
    const [resultat, resultatCatalogue] = await Promise.all([
      prescriptionsService.findAll(props.patientId, 1, 50),
      // 100, pas 200 : PaginationQueryDto plafonne `limit` à 100 (@Max), toute valeur au-delà
      // renvoie 400 — faisait échouer tout le Promise.all (capturé comme "lien de soin absent",
      // message trompeur sans rapport avec la vraie cause).
      catalogue.value.length ? Promise.resolve({ items: catalogue.value }) : pharmacieService.findCatalogue(1, 100),
    ]);
    items.value = resultat.items;
    catalogue.value = resultatCatalogue.items;
  } catch {
    lectureRefusee.value = true;
  } finally {
    chargement.value = false;
  }
}

// --- Création ---
const modalCreationOuvert = ref(false);
const enregistrementCreation = ref(false);
const lignesFormulaire = ref<Array<{ medicamentId: string | undefined; posologie: string; duree: string; voie: string }>>([]);

function ouvrirCreation(): void {
  lignesFormulaire.value = [{ medicamentId: undefined, posologie: '', duree: '', voie: '' }];
  modalCreationOuvert.value = true;
}

function ajouterLigne(): void {
  lignesFormulaire.value.push({ medicamentId: undefined, posologie: '', duree: '', voie: '' });
}

function retirerLigne(index: number): void {
  lignesFormulaire.value.splice(index, 1);
}

async function soumettreCreation(): Promise<void> {
  const lignes = lignesFormulaire.value.filter((l) => l.medicamentId);
  if (!lignes.length) return;
  enregistrementCreation.value = true;
  try {
    await prescriptionsService.create(props.patientId, {
      lignes: lignes.map((l) => ({ medicamentId: l.medicamentId!, posologie: l.posologie, duree: l.duree, voie: l.voie })),
    });
    message.success('Prescription créée.');
    modalCreationOuvert.value = false;
    await charger();
  } finally {
    enregistrementCreation.value = false;
  }
}

// --- Détail / validation / dispensation ---
const modalDetailOuvert = ref(false);
const detailEnCours = ref<PrescriptionAvecLignes | null>(null);
const chargementDetail = ref(false);
const stockParMedicament = reactive<Record<string, StockMedicament[]>>({});
const dispensationSelections = reactive<Record<string, { stockMedicamentId: string | undefined; quantite: number }>>({});

async function ouvrirDetail(prescription: Prescription): Promise<void> {
  modalDetailOuvert.value = true;
  chargementDetail.value = true;
  try {
    detailEnCours.value = await prescriptionsService.findOne(props.patientId, prescription.id);
    if (detailEnCours.value.statut === PrescriptionStatut.VALIDEE) {
      for (const ligne of detailEnCours.value.lignes) {
        if (!stockParMedicament[ligne.medicamentId]) {
          const resultat = await pharmacieService.findStock(1, 50, ligne.medicamentId);
          stockParMedicament[ligne.medicamentId] = resultat.items;
        }
        dispensationSelections[ligne.id] = { stockMedicamentId: undefined, quantite: 1 };
      }
    }
  } finally {
    chargementDetail.value = false;
  }
}

async function validerPrescription(): Promise<void> {
  if (!detailEnCours.value) return;
  await prescriptionsService.valider(props.patientId, detailEnCours.value.id);
  message.success('Prescription validée.');
  modalDetailOuvert.value = false;
  await charger();
}

async function annulerPrescription(): Promise<void> {
  if (!detailEnCours.value) return;
  await prescriptionsService.annuler(props.patientId, detailEnCours.value.id);
  message.success('Prescription annulée.');
  modalDetailOuvert.value = false;
  await charger();
}

async function dispenser(): Promise<void> {
  if (!detailEnCours.value) return;
  const lignes = detailEnCours.value.lignes
    .map((ligne) => {
      const selection = dispensationSelections[ligne.id];
      return selection?.stockMedicamentId
        ? { prescriptionLigneId: ligne.id, stockMedicamentId: selection.stockMedicamentId, quantite: selection.quantite }
        : null;
    })
    .filter((l): l is { prescriptionLigneId: string; stockMedicamentId: string; quantite: number } => l !== null);

  if (lignes.length !== detailEnCours.value.lignes.length) {
    message.error('Sélectionnez un lot pour chaque ligne avant de dispenser.');
    return;
  }

  await pharmacieService.createDispensation({ prescriptionId: detailEnCours.value.id, lignes });
  message.success('Prescription dispensée.');
  modalDetailOuvert.value = false;
  await charger();
}

onMounted(charger);
</script>

<template>
  <a-spin :spinning="chargement">
    <a-alert
      v-if="lectureRefusee"
      type="warning"
      show-icon
      message="Aucun lien de soin actif avec ce patient — prescriptions non visibles."
      style="margin-bottom: 16px"
    />

    <template v-else>
      <div class="entete">
        <a-button v-if="peutPrescrire" type="primary" @click="ouvrirCreation">Nouvelle prescription</a-button>
      </div>

      <a-list :data-source="[...items].reverse()" :locale="{ emptyText: 'Aucune prescription.' }">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta :description="new Date(item.date).toLocaleString('fr-SN')">
              <template #title>
                <a data-cy="prescription-ouvrir" @click="ouvrirDetail(item)">
                  Prescription du {{ new Date(item.date).toLocaleDateString('fr-SN') }}
                </a>
              </template>
            </a-list-item-meta>
            <a-tag data-cy="prescription-statut" :color="COULEUR_STATUT[item.statut as PrescriptionStatut]">
              {{ LIBELLE_STATUT[item.statut as PrescriptionStatut] }}
            </a-tag>
          </a-list-item>
        </template>
      </a-list>
    </template>

    <a-modal v-model:open="modalCreationOuvert" title="Nouvelle prescription" :confirm-loading="enregistrementCreation" width="700" @ok="soumettreCreation">
      <div v-for="(ligne, index) in lignesFormulaire" :key="index" style="border-bottom: 1px solid #f0f0f0; padding-bottom: 12px; margin-bottom: 12px">
        <a-space wrap>
          <a-select v-model:value="ligne.medicamentId" placeholder="Médicament" style="width: 240px" show-search :filter-option="true" option-filter-prop="label">
            <a-select-option v-for="m in catalogue" :key="m.id" :value="m.id" :label="`${m.dci} ${m.dosage}`">
              {{ m.dci }} {{ m.dosage }} ({{ m.forme }})
            </a-select-option>
          </a-select>
          <a-input v-model:value="ligne.posologie" placeholder="Posologie (ex. 1cp matin et soir)" style="width: 220px" />
          <a-input v-model:value="ligne.duree" placeholder="Durée (ex. 7 jours)" style="width: 140px" />
          <a-input v-model:value="ligne.voie" placeholder="Voie (ex. orale)" style="width: 120px" />
          <a-button v-if="lignesFormulaire.length > 1" danger size="small" @click="retirerLigne(index)">Retirer</a-button>
        </a-space>
      </div>
      <a-button @click="ajouterLigne">Ajouter une ligne</a-button>
    </a-modal>

    <a-modal v-model:open="modalDetailOuvert" title="Détail de la prescription" :footer="null" width="700">
      <a-spin :spinning="chargementDetail">
        <template v-if="detailEnCours">
          <a-tag :color="COULEUR_STATUT[detailEnCours.statut]" style="margin-bottom: 16px">{{ LIBELLE_STATUT[detailEnCours.statut] }}</a-tag>

          <a-table :data-source="detailEnCours.lignes" row-key="id" :pagination="false" size="small" style="margin-bottom: 16px">
            <a-table-column title="Médicament" :customRender="rendreMedicamentDeLigne" />
            <a-table-column title="Posologie" data-index="posologie" />
            <a-table-column title="Durée" data-index="duree" />
            <a-table-column title="Voie" data-index="voie" />
            <a-table-column v-if="detailEnCours.statut === PrescriptionStatut.VALIDEE && peutDispenser" title="Lot à dispenser">
              <template #default="{ record }">
                <a-space>
                  <a-select
                    v-model:value="dispensationSelections[record.id].stockMedicamentId"
                    size="small"
                    style="width: 160px"
                    placeholder="Lot"
                    data-cy="dispensation-lot"
                  >
                    <a-select-option v-for="lot in stockParMedicament[record.medicamentId] ?? []" :key="lot.id" :value="lot.id">
                      {{ lot.lot }} ({{ lot.quantite }} dispo.)
                    </a-select-option>
                  </a-select>
                  <a-input-number v-model:value="dispensationSelections[record.id].quantite" :min="1" size="small" style="width: 70px" />
                </a-space>
              </template>
            </a-table-column>
          </a-table>

          <a-space>
            <a-button v-if="peutValider && detailEnCours.statut === PrescriptionStatut.EN_ATTENTE" type="primary" @click="validerPrescription">
              Valider
            </a-button>
            <a-button v-if="peutValider && detailEnCours.statut !== PrescriptionStatut.DISPENSEE && detailEnCours.statut !== PrescriptionStatut.ANNULEE" danger @click="annulerPrescription">
              Annuler
            </a-button>
            <a-button
              v-if="peutDispenser && detailEnCours.statut === PrescriptionStatut.VALIDEE"
              type="primary"
              data-cy="prescription-dispenser"
              @click="dispenser"
            >
              Dispenser
            </a-button>
          </a-space>
        </template>
      </a-spin>
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
