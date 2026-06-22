<script setup lang="ts">
import { LitStatut, Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import * as admissionsLitsService from '../../services/admissions-lits.service';
import type { Chambre, Lit, ServiceClinique, Site } from '../../services/admissions-lits.service';
import { obtenirSocket } from '../../services/realtime';
import * as subscriptionsService from '../../services/subscriptions.service';
import { useAuthStore } from '../../stores/auth.store';

const auth = useAuthStore();
const peutAssigner = auth.aPermission(Permission.LIT_ASSIGN);
const peutLiberer = auth.aPermission(Permission.LIT_LIBERER);
const peutConfigurer = auth.aPermission(Permission.ETABLISSEMENT_SETTINGS);

// Reflète côté UI la garde backend `SubscriptionsService.assertMultiSitesAutorise` : sans le
// feature `multiSites` du forfait, un seul site est autorisé — désactiver le bouton proactivement
// plutôt que de laisser l'utilisateur essuyer le 403 après avoir rempli le formulaire.
const multiSitesAutorise = ref(false);

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
const sites = ref<Site[]>([]);
const chargementTableau = ref(false);
const filtreSiteId = ref<string | undefined>(undefined);

const litsAffiches = computed(() => {
  if (!filtreSiteId.value) return lits.value;
  return lits.value.filter((lit) => lit.siteId === filtreSiteId.value);
});

const peutCreerSite = computed(() => multiSitesAutorise.value || sites.value.length === 0);

function nomChambre(chambreId: string): string {
  const chambre = chambres.value.find((c) => c.id === chambreId);
  return chambre ? `Chambre ${chambre.numero}` : chambreId;
}

function nomServiceParId(serviceId: string): string {
  return services.value.find((s) => s.id === serviceId)?.nom ?? '—';
}

function nomSiteParId(siteId: string): string {
  return sites.value.find((s) => s.id === siteId)?.nom ?? '—';
}

function rendreServiceDeChambre({ record }: { record: Chambre }): string {
  return nomServiceParId(record.serviceId);
}

function rendreChambreDeLit({ record }: { record: Lit }): string {
  return nomChambre(record.chambreId);
}

function rendreSiteDeService({ record }: { record: ServiceClinique }): string {
  return nomSiteParId(record.siteId);
}

function rendreSiteDeChambre({ record }: { record: Chambre }): string {
  return nomSiteParId(record.siteId);
}

async function chargerTableau(): Promise<void> {
  chargementTableau.value = true;
  try {
    const [resultatLits, resultatChambres, resultatServices, resultatSites] = await Promise.all([
      admissionsLitsService.findLits(1, 100),
      admissionsLitsService.findChambres(1, 100),
      admissionsLitsService.findServices(1, 100),
      admissionsLitsService.findSites(1, 100),
    ]);
    lits.value = resultatLits.items;
    chambres.value = resultatChambres.items;
    services.value = resultatServices.items;
    sites.value = resultatSites.items;
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
const modalSiteOuvert = ref(false);
const enregistrementSite = ref(false);
const formulaireSite = reactive({ nom: '', code: '', adresse: '', ville: '', telephone: '' });

const modalServiceOuvert = ref(false);
const enregistrementService = ref(false);
const formulaireService = reactive({ siteId: undefined as string | undefined, nom: '', code: '' });

const modalChambreOuvert = ref(false);
const enregistrementChambre = ref(false);
const formulaireChambre = reactive({ serviceId: undefined as string | undefined, numero: '' });

const modalLitOuvert = ref(false);
const enregistrementLit = ref(false);
const formulaireLit = reactive({ chambreId: undefined as string | undefined, numero: '' });

function ouvrirCreationSite(): void {
  formulaireSite.nom = '';
  formulaireSite.code = '';
  formulaireSite.adresse = '';
  formulaireSite.ville = '';
  formulaireSite.telephone = '';
  modalSiteOuvert.value = true;
}

async function soumettreSite(): Promise<void> {
  enregistrementSite.value = true;
  try {
    await admissionsLitsService.createSite({
      nom: formulaireSite.nom,
      code: formulaireSite.code,
      adresse: formulaireSite.adresse || undefined,
      ville: formulaireSite.ville || undefined,
      telephone: formulaireSite.telephone || undefined,
    });
    message.success('Site créé.');
    modalSiteOuvert.value = false;
    await chargerTableau();
  } finally {
    enregistrementSite.value = false;
  }
}

function ouvrirCreationService(): void {
  formulaireService.siteId = sites.value.length === 1 ? sites.value[0].id : undefined;
  formulaireService.nom = '';
  formulaireService.code = '';
  modalServiceOuvert.value = true;
}

async function soumettreService(): Promise<void> {
  if (!formulaireService.siteId) return;
  enregistrementService.value = true;
  try {
    await admissionsLitsService.createService({
      siteId: formulaireService.siteId,
      nom: formulaireService.nom,
      code: formulaireService.code,
    });
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
  if (peutConfigurer) {
    void subscriptionsService.findMine().then((abonnement) => {
      multiSitesAutorise.value = abonnement?.planSnapshot.features.multiSites ?? false;
    });
  }
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
        <a-select
          v-if="sites.length > 1"
          v-model:value="filtreSiteId"
          placeholder="Filtrer par site"
          style="width: 220px; margin-bottom: 16px"
          allow-clear
        >
          <a-select-option v-for="site in sites" :key="site.id" :value="site.id">{{ site.nom }}</a-select-option>
        </a-select>
        <a-spin :spinning="chargementTableau">
          <a-row :gutter="16">
            <a-col v-for="lit in litsAffiches" :key="lit.id" :span="6" style="margin-bottom: 16px">
              <a-card size="small" :title="`Lit ${lit.numero}`">
                <p>{{ nomServiceParId(lit.serviceId) }} — {{ nomChambre(lit.chambreId) }}</p>
                <p v-if="sites.length > 1" style="color: #888; font-size: 12px">{{ nomSiteParId(lit.siteId) }}</p>
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
          <a-empty v-if="!chargementTableau && litsAffiches.length === 0" description="Aucun lit configuré." />
        </a-spin>
      </a-tab-pane>

      <a-tab-pane v-if="peutConfigurer" key="configuration" tab="Configuration">
        <a-card title="Sites" style="margin-bottom: 16px">
          <template #extra>
            <a-tooltip :title="!peutCreerSite ? 'Votre forfait ne permet qu\'un seul site. Passez à un forfait supérieur pour activer le multi-sites.' : ''">
              <a-button size="small" :disabled="!peutCreerSite" @click="ouvrirCreationSite">Nouveau site</a-button>
            </a-tooltip>
          </template>
          <a-table :data-source="sites" row-key="id" :pagination="false" size="small">
            <a-table-column title="Nom" data-index="nom" />
            <a-table-column title="Code" data-index="code" />
            <a-table-column title="Ville" data-index="ville" />
          </a-table>
        </a-card>

        <a-card title="Services" style="margin-bottom: 16px">
          <template #extra><a-button size="small" @click="ouvrirCreationService">Nouveau service</a-button></template>
          <a-table :data-source="services" row-key="id" :pagination="false" size="small">
            <a-table-column v-if="sites.length > 1" title="Site" :customRender="rendreSiteDeService" />
            <a-table-column title="Nom" data-index="nom" />
            <a-table-column title="Code" data-index="code" />
          </a-table>
        </a-card>

        <a-card title="Chambres" style="margin-bottom: 16px">
          <template #extra><a-button size="small" @click="ouvrirCreationChambre">Nouvelle chambre</a-button></template>
          <a-table :data-source="chambres" row-key="id" :pagination="false" size="small">
            <a-table-column v-if="sites.length > 1" title="Site" :customRender="rendreSiteDeChambre" />
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

    <a-modal v-model:open="modalSiteOuvert" title="Nouveau site" :confirm-loading="enregistrementSite" @ok="soumettreSite">
      <a-form layout="vertical">
        <a-form-item label="Nom"><a-input v-model:value="formulaireSite.nom" /></a-form-item>
        <a-form-item label="Code"><a-input v-model:value="formulaireSite.code" /></a-form-item>
        <a-form-item label="Adresse"><a-input v-model:value="formulaireSite.adresse" /></a-form-item>
        <a-form-item label="Ville"><a-input v-model:value="formulaireSite.ville" /></a-form-item>
        <a-form-item label="Téléphone"><a-input v-model:value="formulaireSite.telephone" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="modalServiceOuvert" title="Nouveau service" :confirm-loading="enregistrementService" @ok="soumettreService">
      <a-form layout="vertical">
        <a-form-item v-if="sites.length > 1" label="Site">
          <a-select v-model:value="formulaireService.siteId">
            <a-select-option v-for="site in sites" :key="site.id" :value="site.id">{{ site.nom }}</a-select-option>
          </a-select>
        </a-form-item>
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
