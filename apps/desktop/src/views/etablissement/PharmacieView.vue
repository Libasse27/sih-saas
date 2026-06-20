<script setup lang="ts">
import { Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import * as pharmacieService from '../../services/pharmacie.service';
import type { MedicamentCatalogue, StockMedicament } from '../../services/pharmacie.service';
import { obtenirSocket } from '../../services/realtime';
import { useAuthStore } from '../../stores/auth.store';

const auth = useAuthStore();
const peutGerer = auth.aPermission(Permission.STOCK_MANAGE);

interface AlerteStock {
  stockMedicamentId: string;
  medicamentId: string;
  lot: string;
  quantite: number;
  seuilAlerte: number;
}

const alertes = ref<AlerteStock[]>([]);

function onAlerteStock(payload: AlerteStock): void {
  if (!alertes.value.some((a) => a.stockMedicamentId === payload.stockMedicamentId)) {
    alertes.value.unshift(payload);
  }
}

// --- Catalogue ---
const catalogue = ref<MedicamentCatalogue[]>([]);
const chargementCatalogue = ref(false);
const modalCatalogueOuvert = ref(false);
const enregistrementCatalogue = ref(false);
const formulaireCatalogue = reactive({ dci: '', codeAtc: '', forme: '', dosage: '' });

async function chargerCatalogue(): Promise<void> {
  chargementCatalogue.value = true;
  try {
    const resultat = await pharmacieService.findCatalogue(1, 200);
    catalogue.value = resultat.items;
  } finally {
    chargementCatalogue.value = false;
  }
}

function ouvrirCreationCatalogue(): void {
  formulaireCatalogue.dci = '';
  formulaireCatalogue.codeAtc = '';
  formulaireCatalogue.forme = '';
  formulaireCatalogue.dosage = '';
  modalCatalogueOuvert.value = true;
}

async function soumettreCatalogue(): Promise<void> {
  enregistrementCatalogue.value = true;
  try {
    await pharmacieService.createMedicamentCatalogue({
      dci: formulaireCatalogue.dci,
      codeAtc: formulaireCatalogue.codeAtc || undefined,
      forme: formulaireCatalogue.forme,
      dosage: formulaireCatalogue.dosage,
    });
    message.success('Médicament ajouté au catalogue.');
    modalCatalogueOuvert.value = false;
    await chargerCatalogue();
  } finally {
    enregistrementCatalogue.value = false;
  }
}

// --- Stock ---
const stock = ref<StockMedicament[]>([]);
const chargementStock = ref(false);
const modalStockOuvert = ref(false);
const enregistrementStock = ref(false);
const formulaireStock = reactive({
  medicamentId: undefined as string | undefined,
  lot: '',
  quantite: 0,
  seuilAlerte: 0,
  dateExpiration: '',
  emplacement: '',
});

function nomMedicament(medicamentId: string): string {
  const medicament = catalogue.value.find((m) => m.id === medicamentId);
  return medicament ? `${medicament.dci} ${medicament.dosage} (${medicament.forme})` : medicamentId;
}

function rendreMedicamentDuStock({ record }: { record: StockMedicament }): string {
  return nomMedicament(record.medicamentId);
}

function rendreExpiration({ record }: { record: StockMedicament }): string {
  return new Date(record.dateExpiration).toLocaleDateString('fr-SN');
}

async function chargerStock(): Promise<void> {
  chargementStock.value = true;
  try {
    const resultat = await pharmacieService.findStock(1, 200);
    stock.value = resultat.items;
  } finally {
    chargementStock.value = false;
  }
}

function ouvrirCreationStock(): void {
  formulaireStock.medicamentId = undefined;
  formulaireStock.lot = '';
  formulaireStock.quantite = 0;
  formulaireStock.seuilAlerte = 0;
  formulaireStock.dateExpiration = '';
  formulaireStock.emplacement = '';
  modalStockOuvert.value = true;
}

async function soumettreStock(): Promise<void> {
  if (!formulaireStock.medicamentId) return;
  enregistrementStock.value = true;
  try {
    await pharmacieService.createStock({
      medicamentId: formulaireStock.medicamentId,
      lot: formulaireStock.lot,
      quantite: formulaireStock.quantite,
      seuilAlerte: formulaireStock.seuilAlerte,
      dateExpiration: formulaireStock.dateExpiration,
      emplacement: formulaireStock.emplacement || undefined,
    });
    message.success('Lot de stock enregistré.');
    modalStockOuvert.value = false;
    await chargerStock();
  } finally {
    enregistrementStock.value = false;
  }
}

onMounted(() => {
  void chargerCatalogue();
  void chargerStock();
  obtenirSocket()?.on('stock:alerte', onAlerteStock);
});

onUnmounted(() => {
  obtenirSocket()?.off('stock:alerte', onAlerteStock);
});
</script>

<template>
  <div>
    <h2>Pharmacie</h2>

    <a-alert
      v-for="alerte in alertes"
      :key="alerte.stockMedicamentId"
      type="warning"
      show-icon
      closable
      style="margin-bottom: 8px"
      :message="`Stock sous le seuil d'alerte — lot ${alerte.lot} (${alerte.quantite}/${alerte.seuilAlerte}).`"
      @close="alertes = alertes.filter((a) => a.stockMedicamentId !== alerte.stockMedicamentId)"
    />

    <a-tabs>
      <a-tab-pane key="stock" tab="Stock">
        <div class="entete"><a-button v-if="peutGerer" type="primary" @click="ouvrirCreationStock">Nouveau lot</a-button></div>
        <a-table :data-source="stock" :loading="chargementStock" row-key="id" size="small">
          <a-table-column title="Médicament" :customRender="rendreMedicamentDuStock" />
          <a-table-column title="Lot" data-index="lot" />
          <a-table-column title="Quantité" data-index="quantite" />
          <a-table-column title="Seuil d’alerte" data-index="seuilAlerte" />
          <a-table-column title="Expiration" :customRender="rendreExpiration" />
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="catalogue" tab="Catalogue médicaments">
        <div class="entete"><a-button v-if="peutGerer" type="primary" @click="ouvrirCreationCatalogue">Nouveau médicament</a-button></div>
        <a-table :data-source="catalogue" :loading="chargementCatalogue" row-key="id" size="small">
          <a-table-column title="DCI" data-index="dci" />
          <a-table-column title="Dosage" data-index="dosage" />
          <a-table-column title="Forme" data-index="forme" />
          <a-table-column title="Code ATC" data-index="codeAtc" />
        </a-table>
      </a-tab-pane>
    </a-tabs>

    <a-modal v-model:open="modalStockOuvert" title="Nouveau lot de stock" :confirm-loading="enregistrementStock" @ok="soumettreStock">
      <a-form layout="vertical">
        <a-form-item label="Médicament">
          <a-select v-model:value="formulaireStock.medicamentId" show-search option-filter-prop="label">
            <a-select-option v-for="m in catalogue" :key="m.id" :value="m.id" :label="`${m.dci} ${m.dosage}`">
              {{ m.dci }} {{ m.dosage }} ({{ m.forme }})
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Numéro de lot"><a-input v-model:value="formulaireStock.lot" /></a-form-item>
        <a-form-item label="Quantité"><a-input-number v-model:value="formulaireStock.quantite" :min="0" style="width: 100%" /></a-form-item>
        <a-form-item label="Seuil d’alerte"><a-input-number v-model:value="formulaireStock.seuilAlerte" :min="0" style="width: 100%" /></a-form-item>
        <a-form-item label="Date d’expiration"><a-input v-model:value="formulaireStock.dateExpiration" type="date" /></a-form-item>
        <a-form-item label="Emplacement"><a-input v-model:value="formulaireStock.emplacement" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="modalCatalogueOuvert" title="Nouveau médicament" :confirm-loading="enregistrementCatalogue" @ok="soumettreCatalogue">
      <a-form layout="vertical">
        <a-form-item label="DCI"><a-input v-model:value="formulaireCatalogue.dci" /></a-form-item>
        <a-form-item label="Dosage"><a-input v-model:value="formulaireCatalogue.dosage" placeholder="500mg" /></a-form-item>
        <a-form-item label="Forme"><a-input v-model:value="formulaireCatalogue.forme" placeholder="comprimé" /></a-form-item>
        <a-form-item label="Code ATC (optionnel)"><a-input v-model:value="formulaireCatalogue.codeAtc" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.entete {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}
</style>
