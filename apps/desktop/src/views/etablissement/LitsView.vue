<script setup lang="ts">
import { LitStatut, Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import * as admissionsLitsService from '../../services/admissions-lits.service';
import type { Chambre, Lit, ServiceClinique } from '../../services/admissions-lits.service';
import { obtenirSocket } from '../../services/realtime';
import { useAuthStore } from '../../stores/auth.store';

const auth = useAuthStore();
const peutAssigner = auth.aPermission(Permission.LIT_ASSIGN);
const peutLiberer = auth.aPermission(Permission.LIT_LIBERER);
const peutConfigurer = auth.aPermission(Permission.ETABLISSEMENT_SETTINGS);

const LIBELLE_STATUT: Record<LitStatut, string> = {
  [LitStatut.LIBRE]: 'Libre',
  [LitStatut.OCCUPE]: 'Occupé',
  [LitStatut.RESERVE]: 'Réservé',
  [LitStatut.MAINTENANCE]: 'Maintenance',
};

const COULEUR_STATUT: Record<LitStatut, string> = {
  [LitStatut.LIBRE]: 'green',
  [LitStatut.OCCUPE]: 'red',
  [LitStatut.RESERVE]: 'orange',
  [LitStatut.MAINTENANCE]: 'default',
};

// --- Tableau temps réel ---
const lits = ref<Lit[]>([]);
const chambres = ref<Chambre[]>([]);
const services = ref<ServiceClinique[]>([]);
const chargementTableau = ref(false);

function nomChambre(chambreId: string): string {
  const chambre = chambres.value.find((c) => c.id === chambreId);
  return chambre ? `Chambre ${chambre.numero}` : chambreId;
}

function nomServiceParId(serviceId: string): string {
  return services.value.find((s) => s.id === serviceId)?.nom ?? '—';
}

function rendreServiceDeChambre({ record }: { record: Chambre }): string {
  return nomServiceParId(record.serviceId);
}

function rendreChambreDeLit({ record }: { record: Lit }): string {
  return nomChambre(record.chambreId);
}

async function chargerTableau(): Promise<void> {
  chargementTableau.value = true;
  try {
    const [resultatLits, resultatChambres, resultatServices] = await Promise.all([
      admissionsLitsService.findLits(1, 100),
      admissionsLitsService.findChambres(1, 100),
      admissionsLitsService.findServices(1, 100),
    ]);
    lits.value = resultatLits.items;
    chambres.value = resultatChambres.items;
    services.value = resultatServices.items;
  } finally {
    chargementTableau.value = false;
  }
}

function onLitMisAJour(payload: { id: string; statut: LitStatut }): void {
  const lit = lits.value.find((l) => l.id === payload.id);
  if (lit) {
    Object.assign(lit, payload);
  }
}

async function libererLit(lit: Lit): Promise<void> {
  await admissionsLitsService.libererLit(lit.id);
  message.success('Lit libéré.');
}

async function changerStatutLit(lit: Lit, statut: LitStatut): Promise<void> {
  await admissionsLitsService.changerStatutLit(lit.id, statut);
  message.success('Statut du lit mis à jour.');
}

// --- Configuration ---
const modalServiceOuvert = ref(false);
const enregistrementService = ref(false);
const formulaireService = reactive({ nom: '', code: '' });

const modalChambreOuvert = ref(false);
const enregistrementChambre = ref(false);
const formulaireChambre = reactive({ serviceId: undefined as string | undefined, numero: '' });

const modalLitOuvert = ref(false);
const enregistrementLit = ref(false);
const formulaireLit = reactive({ chambreId: undefined as string | undefined, numero: '' });

function ouvrirCreationService(): void {
  formulaireService.nom = '';
  formulaireService.code = '';
  modalServiceOuvert.value = true;
}

async function soumettreService(): Promise<void> {
  enregistrementService.value = true;
  try {
    await admissionsLitsService.createService({ nom: formulaireService.nom, code: formulaireService.code });
    message.success('Service créé.');
    modalServiceOuvert.value = false;
    await chargerTableau();
  } finally {
    enregistrementService.value = false;
  }
}

function ouvrirCreationChambre(): void {
  formulaireChambre.serviceId = undefined;
  formulaireChambre.numero = '';
  modalChambreOuvert.value = true;
}

async function soumettreChambre(): Promise<void> {
  if (!formulaireChambre.serviceId) return;
  enregistrementChambre.value = true;
  try {
    await admissionsLitsService.createChambre({ serviceId: formulaireChambre.serviceId, numero: formulaireChambre.numero });
    message.success('Chambre créée.');
    modalChambreOuvert.value = false;
    await chargerTableau();
  } finally {
    enregistrementChambre.value = false;
  }
}

function ouvrirCreationLit(): void {
  formulaireLit.chambreId = undefined;
  formulaireLit.numero = '';
  modalLitOuvert.value = true;
}

async function soumettreLit(): Promise<void> {
  if (!formulaireLit.chambreId) return;
  enregistrementLit.value = true;
  try {
    await admissionsLitsService.createLit({ chambreId: formulaireLit.chambreId, numero: formulaireLit.numero });
    message.success('Lit créé.');
    modalLitOuvert.value = false;
    await chargerTableau();
  } finally {
    enregistrementLit.value = false;
  }
}

onMounted(() => {
  void chargerTableau();
  obtenirSocket()?.on('lits:updated', onLitMisAJour);
});

onUnmounted(() => {
  obtenirSocket()?.off('lits:updated', onLitMisAJour);
});
</script>

<template>
  <div>
    <h2>Lits</h2>

    <a-tabs>
      <a-tab-pane key="tableau" tab="Tableau des lits">
        <a-spin :spinning="chargementTableau">
          <a-row :gutter="16">
            <a-col v-for="lit in lits" :key="lit.id" :span="6" style="margin-bottom: 16px">
              <a-card size="small" :title="`Lit ${lit.numero}`">
                <p>{{ nomServiceParId(lit.serviceId) }} — {{ nomChambre(lit.chambreId) }}</p>
                <a-tag :color="COULEUR_STATUT[lit.statut]">{{ LIBELLE_STATUT[lit.statut] }}</a-tag>
                <div style="margin-top: 8px">
                  <a-space>
                    <a-button v-if="peutLiberer && lit.statut !== LitStatut.LIBRE" size="small" @click="libererLit(lit)">
                      Libérer
                    </a-button>
                    <a-select
                      v-if="peutAssigner && lit.statut !== LitStatut.OCCUPE"
                      size="small"
                      placeholder="Changer statut"
                      style="width: 130px"
                      @change="(valeur: LitStatut) => changerStatutLit(lit, valeur)"
                    >
                      <a-select-option :value="LitStatut.LIBRE">Libre</a-select-option>
                      <a-select-option :value="LitStatut.RESERVE">Réservé</a-select-option>
                      <a-select-option :value="LitStatut.MAINTENANCE">Maintenance</a-select-option>
                    </a-select>
                  </a-space>
                </div>
              </a-card>
            </a-col>
          </a-row>
          <a-empty v-if="!chargementTableau && lits.length === 0" description="Aucun lit configuré." />
        </a-spin>
      </a-tab-pane>

      <a-tab-pane v-if="peutConfigurer" key="configuration" tab="Configuration">
        <a-card title="Services" style="margin-bottom: 16px">
          <template #extra><a-button size="small" @click="ouvrirCreationService">Nouveau service</a-button></template>
          <a-table :data-source="services" :columns="[{ title: 'Nom', dataIndex: 'nom' }, { title: 'Code', dataIndex: 'code' }]" row-key="id" :pagination="false" size="small" />
        </a-card>

        <a-card title="Chambres" style="margin-bottom: 16px">
          <template #extra><a-button size="small" @click="ouvrirCreationChambre">Nouvelle chambre</a-button></template>
          <a-table :data-source="chambres" row-key="id" :pagination="false" size="small">
            <a-table-column title="Service" :customRender="rendreServiceDeChambre" />
            <a-table-column title="Numéro" data-index="numero" />
          </a-table>
        </a-card>

        <a-card title="Lits">
          <template #extra><a-button size="small" @click="ouvrirCreationLit">Nouveau lit</a-button></template>
          <a-table :data-source="lits" row-key="id" :pagination="false" size="small">
            <a-table-column title="Chambre" :customRender="rendreChambreDeLit" />
            <a-table-column title="Numéro" data-index="numero" />
          </a-table>
        </a-card>
      </a-tab-pane>
    </a-tabs>

    <a-modal v-model:open="modalServiceOuvert" title="Nouveau service" :confirm-loading="enregistrementService" @ok="soumettreService">
      <a-form layout="vertical">
        <a-form-item label="Nom"><a-input v-model:value="formulaireService.nom" /></a-form-item>
        <a-form-item label="Code"><a-input v-model:value="formulaireService.code" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="modalChambreOuvert" title="Nouvelle chambre" :confirm-loading="enregistrementChambre" @ok="soumettreChambre">
      <a-form layout="vertical">
        <a-form-item label="Service">
          <a-select v-model:value="formulaireChambre.serviceId">
            <a-select-option v-for="service in services" :key="service.id" :value="service.id">{{ service.nom }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Numéro"><a-input v-model:value="formulaireChambre.numero" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="modalLitOuvert" title="Nouveau lit" :confirm-loading="enregistrementLit" @ok="soumettreLit">
      <a-form layout="vertical">
        <a-form-item label="Chambre">
          <a-select v-model:value="formulaireLit.chambreId">
            <a-select-option v-for="chambre in chambres" :key="chambre.id" :value="chambre.id">{{ nomServiceParId(chambre.serviceId) }} — {{ chambre.numero }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Numéro"><a-input v-model:value="formulaireLit.numero" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
