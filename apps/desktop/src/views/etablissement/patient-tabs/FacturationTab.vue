<script setup lang="ts">
import { FacturePatientStatut, ModePaiementPatient, OrganismeAssurance, Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as facturationService from '../../../services/facturation-patient.service';
import type { Assurance, FacturePatient, PaiementPatient } from '../../../services/facturation-patient.service';
import { useAuthStore } from '../../../stores/auth.store';

const props = defineProps<{ patientId: string }>();

const auth = useAuthStore();
const peutGererAssurance = auth.aPermission(Permission.ASSURANCE_MANAGE);
const peutFacturer = auth.aPermission(Permission.FACTURE_PATIENT_CREATE);
const peutEncaisser = auth.aPermission(Permission.PAIEMENT_PATIENT_CREATE);

const LIBELLE_STATUT_FACTURE: Record<FacturePatientStatut, string> = {
  [FacturePatientStatut.EN_ATTENTE]: 'En attente',
  [FacturePatientStatut.PARTIELLEMENT_PAYEE]: 'Partiellement payée',
  [FacturePatientStatut.PAYEE]: 'Payée',
  [FacturePatientStatut.ANNULEE]: 'Annulée',
};

const COULEUR_STATUT_FACTURE: Record<FacturePatientStatut, string> = {
  [FacturePatientStatut.EN_ATTENTE]: 'orange',
  [FacturePatientStatut.PARTIELLEMENT_PAYEE]: 'blue',
  [FacturePatientStatut.PAYEE]: 'green',
  [FacturePatientStatut.ANNULEE]: 'default',
};

const assurances = ref<Assurance[]>([]);
const factures = ref<FacturePatient[]>([]);
const chargement = ref(true);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const [resultatAssurances, resultatFactures] = await Promise.all([
      facturationService.findAssurances(props.patientId),
      facturationService.findFacturesForPatient(props.patientId, 1, 50),
    ]);
    assurances.value = resultatAssurances;
    factures.value = resultatFactures.items;
  } finally {
    chargement.value = false;
  }
}

// --- Assurance ---
const modalAssuranceOuvert = ref(false);
const enregistrementAssurance = ref(false);
const formulaireAssurance = reactive({
  organisme: OrganismeAssurance.IPM,
  numeroPolice: '',
  tauxCouverture: 70,
  valideDu: '',
  valideAu: '',
});

function ouvrirCreationAssurance(): void {
  formulaireAssurance.organisme = OrganismeAssurance.IPM;
  formulaireAssurance.numeroPolice = '';
  formulaireAssurance.tauxCouverture = 70;
  formulaireAssurance.valideDu = '';
  formulaireAssurance.valideAu = '';
  modalAssuranceOuvert.value = true;
}

async function soumettreAssurance(): Promise<void> {
  enregistrementAssurance.value = true;
  try {
    await facturationService.createAssurance(props.patientId, { ...formulaireAssurance });
    message.success('Assurance enregistrée.');
    modalAssuranceOuvert.value = false;
    await charger();
  } finally {
    enregistrementAssurance.value = false;
  }
}

// --- Facture ---
const modalFactureOuvert = ref(false);
const enregistrementFacture = ref(false);
const lignesFacture = ref<Array<{ libelle: string; quantite: number; prixUnitaire: number }>>([]);

function ouvrirCreationFacture(): void {
  lignesFacture.value = [{ libelle: '', quantite: 1, prixUnitaire: 0 }];
  modalFactureOuvert.value = true;
}

function ajouterLigneFacture(): void {
  lignesFacture.value.push({ libelle: '', quantite: 1, prixUnitaire: 0 });
}

function retirerLigneFacture(index: number): void {
  lignesFacture.value.splice(index, 1);
}

async function soumettreFacture(): Promise<void> {
  const lignes = lignesFacture.value.filter((l) => l.libelle.trim());
  if (!lignes.length) return;
  enregistrementFacture.value = true;
  try {
    await facturationService.createFacture(props.patientId, { lignes });
    message.success('Facture créée.');
    modalFactureOuvert.value = false;
    await charger();
  } finally {
    enregistrementFacture.value = false;
  }
}

// --- Paiements ---
const modalPaiementsOuvert = ref(false);
const factureEnCours = ref<FacturePatient | null>(null);
const paiements = ref<PaiementPatient[]>([]);
const chargementPaiements = ref(false);
const nouveauPaiement = reactive({ montant: 0, mode: ModePaiementPatient.CAISSE });
const enregistrementPaiement = ref(false);

async function ouvrirPaiements(facture: FacturePatient): Promise<void> {
  factureEnCours.value = facture;
  nouveauPaiement.montant = facture.partPatient;
  nouveauPaiement.mode = ModePaiementPatient.CAISSE;
  modalPaiementsOuvert.value = true;
  chargementPaiements.value = true;
  try {
    paiements.value = await facturationService.findPaiements(facture.id);
  } finally {
    chargementPaiements.value = false;
  }
}

async function soumettrePaiement(): Promise<void> {
  if (!factureEnCours.value) return;
  enregistrementPaiement.value = true;
  try {
    await facturationService.createPaiement(factureEnCours.value.id, { ...nouveauPaiement });
    message.success('Paiement enregistré.');
    paiements.value = await facturationService.findPaiements(factureEnCours.value.id);
    await charger();
  } finally {
    enregistrementPaiement.value = false;
  }
}

function rendreCouverture({ record }: { record: Assurance }): string {
  return `${record.tauxCouverture}%`;
}

function rendreValidite({ record }: { record: Assurance }): string {
  return `${record.valideDu} → ${record.valideAu}`;
}

function rendreTotal({ record }: { record: FacturePatient }): string {
  return `${record.montantTotal} FCFA`;
}

function rendrePartPatient({ record }: { record: FacturePatient }): string {
  return `${record.partPatient} FCFA`;
}

onMounted(charger);
</script>

<template>
  <a-spin :spinning="chargement">
    <a-card title="Assurances" style="margin-bottom: 16px">
      <template #extra><a-button v-if="peutGererAssurance" size="small" @click="ouvrirCreationAssurance">Ajouter</a-button></template>
      <a-table :data-source="assurances" row-key="id" :pagination="false" size="small">
        <a-table-column title="Organisme" data-index="organisme" />
        <a-table-column title="N° police" data-index="numeroPolice" />
        <a-table-column title="Couverture" :customRender="rendreCouverture" />
        <a-table-column title="Validité" :customRender="rendreValidite" />
      </a-table>
    </a-card>

    <a-card title="Factures">
      <template #extra><a-button v-if="peutFacturer" size="small" @click="ouvrirCreationFacture">Nouvelle facture</a-button></template>
      <a-table :data-source="factures" row-key="id" :pagination="false" size="small">
        <a-table-column title="N°" data-index="numero" />
        <a-table-column title="Total" :customRender="rendreTotal" />
        <a-table-column title="Part patient" :customRender="rendrePartPatient" />
        <a-table-column title="Statut">
          <template #default="{ record }">
            <a-tag :color="COULEUR_STATUT_FACTURE[record.statut as FacturePatientStatut]">{{ LIBELLE_STATUT_FACTURE[record.statut as FacturePatientStatut] }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="Actions">
          <template #default="{ record }">
            <a-button size="small" @click="ouvrirPaiements(record)">Paiements</a-button>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal v-model:open="modalAssuranceOuvert" title="Nouvelle assurance" :confirm-loading="enregistrementAssurance" @ok="soumettreAssurance">
      <a-form layout="vertical">
        <a-form-item label="Organisme">
          <a-select v-model:value="formulaireAssurance.organisme">
            <a-select-option v-for="organisme in Object.values(OrganismeAssurance)" :key="organisme" :value="organisme">{{ organisme }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="N° de police"><a-input v-model:value="formulaireAssurance.numeroPolice" /></a-form-item>
        <a-form-item label="Taux de couverture (%)"><a-input-number v-model:value="formulaireAssurance.tauxCouverture" :min="0" :max="100" style="width: 100%" /></a-form-item>
        <a-form-item label="Valide du"><a-input v-model:value="formulaireAssurance.valideDu" type="date" /></a-form-item>
        <a-form-item label="Valide au"><a-input v-model:value="formulaireAssurance.valideAu" type="date" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="modalFactureOuvert" title="Nouvelle facture" :confirm-loading="enregistrementFacture" width="650" @ok="soumettreFacture">
      <div v-for="(ligne, index) in lignesFacture" :key="index" style="margin-bottom: 8px">
        <a-space>
          <a-input v-model:value="ligne.libelle" placeholder="Libellé (ex. Consultation)" style="width: 220px" />
          <a-input-number v-model:value="ligne.quantite" :min="1" placeholder="Qté" style="width: 90px" />
          <a-input-number v-model:value="ligne.prixUnitaire" :min="0" placeholder="Prix unitaire" style="width: 130px" />
          <a-button v-if="lignesFacture.length > 1" danger size="small" @click="retirerLigneFacture(index)">Retirer</a-button>
        </a-space>
      </div>
      <a-button @click="ajouterLigneFacture">Ajouter une ligne</a-button>
    </a-modal>

    <a-modal v-model:open="modalPaiementsOuvert" title="Paiements" :footer="null" width="600">
      <a-spin :spinning="chargementPaiements">
        <a-list :data-source="paiements" :locale="{ emptyText: 'Aucun paiement enregistré.' }" style="margin-bottom: 16px">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta :description="new Date(item.date).toLocaleString('fr-SN')">
                <template #title>{{ item.montant }} FCFA — {{ item.mode }} — {{ item.statut }}</template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>

        <a-form v-if="peutEncaisser && factureEnCours && factureEnCours.statut !== FacturePatientStatut.PAYEE" layout="inline">
          <a-form-item label="Montant"><a-input-number v-model:value="nouveauPaiement.montant" :min="1" /></a-form-item>
          <a-form-item label="Mode">
            <a-select v-model:value="nouveauPaiement.mode" style="width: 140px">
              <a-select-option v-for="mode in Object.values(ModePaiementPatient)" :key="mode" :value="mode">{{ mode }}</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" :loading="enregistrementPaiement" @click="soumettrePaiement">Encaisser</a-button>
          </a-form-item>
        </a-form>
      </a-spin>
    </a-modal>
  </a-spin>
</template>
