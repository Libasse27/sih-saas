<!-- apps/desktop/src/views/etablissement/RhView.vue -->
<script setup lang="ts">
import {
  CongeStatut,
  CongeType,
  ContratTravailStatut,
  ContratTravailType,
  EmployeStatut,
  FormationStatut,
  Permission,
  PresenceStatut,
} from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as rhService from '../../services/rh.service';
import type { Conge, ContratTravail, Employe, Formation, Presence } from '../../services/rh.service';
import { useAuthStore } from '../../stores/auth.store';

const auth = useAuthStore();
const peutGerer = auth.aPermission(Permission.RH_MANAGE);

// ── EMPLOYÉS ────────────────────────────────────────────────────────────────

const employes = ref<Employe[]>([]);
const chargementEmployes = ref(false);
const paginationEmployes = reactive({ page: 1, limit: 20, total: 0 });

const modalEmployeOuvert = ref(false);
const enregistrementEmploye = ref(false);
const editEmployeId = ref<string | null>(null);
const formulaireEmploye = reactive({
  matricule: '',
  nom: '',
  prenom: '',
  poste: '',
  dateEmbauche: '',
  telephone: '',
  email: '',
});

const COULEUR_STATUT_EMPLOYE: Record<EmployeStatut, string> = {
  [EmployeStatut.ACTIF]: 'green',
  [EmployeStatut.INACTIF]: 'default',
  [EmployeStatut.SUSPENDU]: 'orange',
  [EmployeStatut.DEMISSIONNAIRE]: 'red',
};

const colonnesEmployes = [
  { title: 'Matricule', dataIndex: 'matricule', key: 'matricule' },
  { title: 'Nom', key: 'nomComplet' },
  { title: 'Poste', dataIndex: 'poste', key: 'poste' },
  { title: 'Date embauche', key: 'dateEmbauche' },
  { title: 'Statut', key: 'statut' },
  { title: 'Actions', key: 'actions' },
];

async function chargerEmployes(): Promise<void> {
  chargementEmployes.value = true;
  try {
    const res = await rhService.findAllEmployes(paginationEmployes.page, paginationEmployes.limit);
    employes.value = res.items;
    paginationEmployes.total = res.total;
  } finally {
    chargementEmployes.value = false;
  }
}

function ouvrirCreationEmploye(): void {
  editEmployeId.value = null;
  Object.assign(formulaireEmploye, { matricule: '', nom: '', prenom: '', poste: '', dateEmbauche: '', telephone: '', email: '' });
  modalEmployeOuvert.value = true;
}

function ouvrirEditionEmploye(employe: Employe): void {
  editEmployeId.value = employe.id;
  Object.assign(formulaireEmploye, {
    matricule: employe.matricule,
    nom: employe.nom,
    prenom: employe.prenom,
    poste: employe.poste,
    dateEmbauche: employe.dateEmbauche.substring(0, 10),
    telephone: employe.telephone ?? '',
    email: employe.email ?? '',
  });
  modalEmployeOuvert.value = true;
}

async function soumettreEmploye(): Promise<void> {
  if (!formulaireEmploye.matricule || !formulaireEmploye.nom || !formulaireEmploye.prenom || !formulaireEmploye.poste || !formulaireEmploye.dateEmbauche) {
    message.warning('Matricule, nom, prénom, poste et date d\'embauche sont obligatoires.');
    return;
  }
  enregistrementEmploye.value = true;
  try {
    const dto = {
      matricule: formulaireEmploye.matricule,
      nom: formulaireEmploye.nom,
      prenom: formulaireEmploye.prenom,
      poste: formulaireEmploye.poste,
      dateEmbauche: formulaireEmploye.dateEmbauche,
      telephone: formulaireEmploye.telephone || undefined,
      email: formulaireEmploye.email || undefined,
    };
    if (editEmployeId.value) {
      await rhService.updateEmploye(editEmployeId.value, dto);
      message.success('Employé mis à jour.');
    } else {
      await rhService.createEmploye(dto);
      message.success('Employé enregistré.');
    }
    modalEmployeOuvert.value = false;
    await chargerEmployes();
  } finally {
    enregistrementEmploye.value = false;
  }
}

// ── CONGÉS (par employé sélectionné) ───────────────────────────────────────

const employeSelectionne = ref<Employe | null>(null);
const conges = ref<Conge[]>([]);
const chargementConges = ref(false);

const modalCongeOuvert = ref(false);
const enregistrementConge = ref(false);
const formulaireConge = reactive({
  type: CongeType.CONGE_PAYE as CongeType,
  dateDebut: '',
  dateFin: '',
  nombreJours: 1,
  motif: '',
});

const LIBELLE_CONGE_TYPE: Record<CongeType, string> = {
  [CongeType.CONGE_PAYE]: 'Congé payé',
  [CongeType.MALADIE]: 'Maladie',
  [CongeType.MATERNITE]: 'Maternité',
  [CongeType.PATERNITE]: 'Paternité',
  [CongeType.SANS_SOLDE]: 'Sans solde',
  [CongeType.AUTRE]: 'Autre',
};

const COULEUR_CONGE_STATUT: Record<CongeStatut, string> = {
  [CongeStatut.DEMANDE]: 'blue',
  [CongeStatut.APPROUVE]: 'green',
  [CongeStatut.REJETE]: 'red',
  [CongeStatut.ANNULE]: 'default',
};

const colonnesConges = [
  { title: 'Type', key: 'type' },
  { title: 'Du', key: 'dateDebut' },
  { title: 'Au', key: 'dateFin' },
  { title: 'Jours', dataIndex: 'nombreJours', key: 'nombreJours' },
  { title: 'Statut', key: 'statut' },
  { title: 'Actions', key: 'actions' },
];

async function selectionnerEmployePourConges(employe: Employe): Promise<void> {
  employeSelectionne.value = employe;
  chargementConges.value = true;
  try {
    conges.value = await rhService.findConges(employe.id);
  } finally {
    chargementConges.value = false;
  }
}

async function soumettreConge(): Promise<void> {
  if (!employeSelectionne.value) return;
  if (!formulaireConge.dateDebut || !formulaireConge.dateFin) {
    message.warning('Les dates de début et fin sont obligatoires.');
    return;
  }
  enregistrementConge.value = true;
  try {
    await rhService.createConge(employeSelectionne.value.id, {
      type: formulaireConge.type,
      dateDebut: formulaireConge.dateDebut,
      dateFin: formulaireConge.dateFin,
      nombreJours: formulaireConge.nombreJours,
      motif: formulaireConge.motif || undefined,
    });
    message.success('Demande de congé enregistrée.');
    modalCongeOuvert.value = false;
    await selectionnerEmployePourConges(employeSelectionne.value);
  } finally {
    enregistrementConge.value = false;
  }
}

async function validerConge(conge: Conge): Promise<void> {
  await rhService.validerConge(conge.id);
  message.success('Congé approuvé.');
  if (employeSelectionne.value) await selectionnerEmployePourConges(employeSelectionne.value);
}

async function rejeterConge(conge: Conge): Promise<void> {
  await rhService.rejeterConge(conge.id);
  message.success('Congé rejeté.');
  if (employeSelectionne.value) await selectionnerEmployePourConges(employeSelectionne.value);
}

// ── PRÉSENCES ───────────────────────────────────────────────────────────────

const presences = ref<Presence[]>([]);
const chargementPresences = ref(false);
const employePresence = ref<Employe | null>(null);

const modalPresenceOuvert = ref(false);
const enregistrementPresence = ref(false);
const formulairePresence = reactive({
  date: '',
  heureArrivee: '',
  heureDepart: '',
  statut: PresenceStatut.PRESENT as PresenceStatut,
  commentaire: '',
});

const LIBELLE_PRESENCE: Record<PresenceStatut, string> = {
  [PresenceStatut.PRESENT]: 'Présent',
  [PresenceStatut.ABSENT]: 'Absent',
  [PresenceStatut.RETARD]: 'Retard',
  [PresenceStatut.CONGE]: 'Congé',
};

const COULEUR_PRESENCE: Record<PresenceStatut, string> = {
  [PresenceStatut.PRESENT]: 'green',
  [PresenceStatut.ABSENT]: 'red',
  [PresenceStatut.RETARD]: 'orange',
  [PresenceStatut.CONGE]: 'blue',
};

const colonnesPresences = [
  { title: 'Date', key: 'date' },
  { title: 'Arrivée', key: 'heureArrivee' },
  { title: 'Départ', key: 'heureDepart' },
  { title: 'Statut', key: 'statut' },
  { title: 'Commentaire', dataIndex: 'commentaire', key: 'commentaire', ellipsis: true },
];

async function selectionnerEmployePourPresences(employe: Employe): Promise<void> {
  employePresence.value = employe;
  chargementPresences.value = true;
  try {
    presences.value = await rhService.findPresences(employe.id);
  } finally {
    chargementPresences.value = false;
  }
}

async function soumettrePresence(): Promise<void> {
  if (!employePresence.value || !formulairePresence.date) {
    message.warning('La date est obligatoire.');
    return;
  }
  enregistrementPresence.value = true;
  try {
    await rhService.createPresence(employePresence.value.id, {
      date: formulairePresence.date,
      heureArrivee: formulairePresence.heureArrivee || undefined,
      heureDepart: formulairePresence.heureDepart || undefined,
      statut: formulairePresence.statut,
      commentaire: formulairePresence.commentaire || undefined,
    });
    message.success('Pointage enregistré.');
    modalPresenceOuvert.value = false;
    await selectionnerEmployePourPresences(employePresence.value);
  } finally {
    enregistrementPresence.value = false;
  }
}

// ── FORMATIONS ──────────────────────────────────────────────────────────────

const formations = ref<Formation[]>([]);
const chargementFormations = ref(false);
const employeFormation = ref<Employe | null>(null);

const modalFormationOuvert = ref(false);
const enregistrementFormation = ref(false);
const formulaireFormation = reactive({ intitule: '', organisme: '', dateDebut: '', dateFin: '' });

const COULEUR_FORMATION: Record<FormationStatut, string> = {
  [FormationStatut.PLANIFIEE]: 'blue',
  [FormationStatut.EN_COURS]: 'orange',
  [FormationStatut.TERMINEE]: 'green',
  [FormationStatut.ANNULEE]: 'default',
};

const colonnesFormations = [
  { title: 'Intitulé', dataIndex: 'intitule', key: 'intitule' },
  { title: 'Organisme', key: 'organisme' },
  { title: 'Du', key: 'dateDebut' },
  { title: 'Au', key: 'dateFin' },
  { title: 'Statut', key: 'statut' },
];

async function selectionnerEmployePourFormations(employe: Employe): Promise<void> {
  employeFormation.value = employe;
  chargementFormations.value = true;
  try {
    formations.value = await rhService.findFormations(employe.id);
  } finally {
    chargementFormations.value = false;
  }
}

async function soumettreFormation(): Promise<void> {
  if (!employeFormation.value || !formulaireFormation.intitule || !formulaireFormation.dateDebut) {
    message.warning('L\'intitulé et la date de début sont obligatoires.');
    return;
  }
  enregistrementFormation.value = true;
  try {
    await rhService.createFormation(employeFormation.value.id, {
      intitule: formulaireFormation.intitule,
      organisme: formulaireFormation.organisme || undefined,
      dateDebut: formulaireFormation.dateDebut,
      dateFin: formulaireFormation.dateFin || undefined,
    });
    message.success('Formation enregistrée.');
    modalFormationOuvert.value = false;
    await selectionnerEmployePourFormations(employeFormation.value);
  } finally {
    enregistrementFormation.value = false;
  }
}

// ── CONTRATS ─────────────────────────────────────────────────────────────────

const contrats = ref<ContratTravail[]>([]);
const chargementContrats = ref(false);
const employeContrat = ref<Employe | null>(null);

const modalContratOuvert = ref(false);
const enregistrementContrat = ref(false);
const formulaireContrat = reactive({
  type: ContratTravailType.CDI as ContratTravailType,
  dateDebut: '',
  dateFin: '',
  salaireBase: 0,
});

const LIBELLE_CONTRAT: Record<ContratTravailType, string> = {
  [ContratTravailType.CDI]: 'CDI',
  [ContratTravailType.CDD]: 'CDD',
  [ContratTravailType.STAGE]: 'Stage',
  [ContratTravailType.VACATION]: 'Vacation',
  [ContratTravailType.PRESTATION]: 'Prestation',
};

const COULEUR_CONTRAT_STATUT: Record<ContratTravailStatut, string> = {
  [ContratTravailStatut.ACTIF]: 'green',
  [ContratTravailStatut.TERMINE]: 'default',
  [ContratTravailStatut.SUSPENDU]: 'orange',
};

const colonnesContrats = [
  { title: 'Type', key: 'type' },
  { title: 'Début', key: 'dateDebut' },
  { title: 'Fin', key: 'dateFin' },
  { title: 'Salaire de base', key: 'salaireBase' },
  { title: 'Statut', key: 'statut' },
];

async function selectionnerEmployePourContrats(employe: Employe): Promise<void> {
  employeContrat.value = employe;
  chargementContrats.value = true;
  try {
    contrats.value = await rhService.findContrats(employe.id);
  } finally {
    chargementContrats.value = false;
  }
}

async function soumettreContrat(): Promise<void> {
  if (!employeContrat.value || !formulaireContrat.dateDebut || formulaireContrat.salaireBase <= 0) {
    message.warning('Type, date de début et salaire de base sont obligatoires.');
    return;
  }
  enregistrementContrat.value = true;
  try {
    await rhService.createContrat(employeContrat.value.id, {
      type: formulaireContrat.type,
      dateDebut: formulaireContrat.dateDebut,
      dateFin: formulaireContrat.dateFin || undefined,
      salaireBase: formulaireContrat.salaireBase,
    });
    message.success('Contrat enregistré.');
    modalContratOuvert.value = false;
    await selectionnerEmployePourContrats(employeContrat.value);
  } finally {
    enregistrementContrat.value = false;
  }
}

onMounted(chargerEmployes);
</script>

<template>
  <div>
    <div class="entete">
      <h2>Ressources Humaines</h2>
    </div>

    <a-tabs>
      <!-- ONGLET EMPLOYÉS -->
      <a-tab-pane key="employes" tab="Employés">
        <div class="entete">
          <span />
          <a-button v-if="peutGerer" type="primary" @click="ouvrirCreationEmploye">Nouvel employé</a-button>
        </div>
        <a-table
          :columns="colonnesEmployes"
          :data-source="employes"
          :loading="chargementEmployes"
          row-key="id"
          :pagination="{
            current: paginationEmployes.page,
            pageSize: paginationEmployes.limit,
            total: paginationEmployes.total,
            onChange: (p: number) => { paginationEmployes.page = p; void chargerEmployes(); },
          }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'nomComplet'">
              {{ (record as Employe).prenom }} {{ (record as Employe).nom }}
            </template>
            <template v-else-if="column.key === 'dateEmbauche'">
              {{ new Date((record as Employe).dateEmbauche).toLocaleDateString('fr-SN') }}
            </template>
            <template v-else-if="column.key === 'statut'">
              <a-tag :color="COULEUR_STATUT_EMPLOYE[(record as Employe).statut]">
                {{ (record as Employe).statut }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space>
                <a-button v-if="peutGerer" size="small" @click="ouvrirEditionEmploye(record as Employe)">Modifier</a-button>
                <a-button size="small" @click="selectionnerEmployePourConges(record as Employe)">Congés</a-button>
                <a-button size="small" @click="selectionnerEmployePourPresences(record as Employe)">Présences</a-button>
                <a-button size="small" @click="selectionnerEmployePourFormations(record as Employe)">Formations</a-button>
                <a-button size="small" @click="selectionnerEmployePourContrats(record as Employe)">Contrats</a-button>
              </a-space>
            </template>
          </template>
        </a-table>

        <!-- Sous-panneaux par employé sélectionné -->
        <template v-if="employeSelectionne">
          <a-divider />
          <div class="entete">
            <h3>Congés de {{ employeSelectionne.prenom }} {{ employeSelectionne.nom }}</h3>
            <a-button v-if="peutGerer" @click="modalCongeOuvert = true">Ajouter un congé</a-button>
          </div>
          <a-table :columns="colonnesConges" :data-source="conges" :loading="chargementConges" row-key="id" :pagination="false">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'type'">{{ LIBELLE_CONGE_TYPE[(record as Conge).type] }}</template>
              <template v-else-if="column.key === 'dateDebut'">{{ new Date((record as Conge).dateDebut).toLocaleDateString('fr-SN') }}</template>
              <template v-else-if="column.key === 'dateFin'">{{ new Date((record as Conge).dateFin).toLocaleDateString('fr-SN') }}</template>
              <template v-else-if="column.key === 'statut'">
                <a-tag :color="COULEUR_CONGE_STATUT[(record as Conge).statut]">{{ (record as Conge).statut }}</a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space v-if="peutGerer && (record as Conge).statut === CongeStatut.DEMANDE">
                  <a-button size="small" type="primary" @click="validerConge(record as Conge)">Approuver</a-button>
                  <a-button size="small" danger @click="rejeterConge(record as Conge)">Rejeter</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </template>

        <template v-if="employePresence">
          <a-divider />
          <div class="entete">
            <h3>Présences de {{ employePresence.prenom }} {{ employePresence.nom }}</h3>
            <a-button v-if="peutGerer" @click="modalPresenceOuvert = true">Ajouter un pointage</a-button>
          </div>
          <a-table :columns="colonnesPresences" :data-source="presences" :loading="chargementPresences" row-key="id" :pagination="false">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'date'">{{ new Date((record as Presence).date).toLocaleDateString('fr-SN') }}</template>
              <template v-else-if="column.key === 'heureArrivee'">{{ (record as Presence).heureArrivee ?? '—' }}</template>
              <template v-else-if="column.key === 'heureDepart'">{{ (record as Presence).heureDepart ?? '—' }}</template>
              <template v-else-if="column.key === 'statut'">
                <a-tag :color="COULEUR_PRESENCE[(record as Presence).statut]">{{ LIBELLE_PRESENCE[(record as Presence).statut] }}</a-tag>
              </template>
            </template>
          </a-table>
        </template>

        <template v-if="employeFormation">
          <a-divider />
          <div class="entete">
            <h3>Formations de {{ employeFormation.prenom }} {{ employeFormation.nom }}</h3>
            <a-button v-if="peutGerer" @click="modalFormationOuvert = true">Ajouter une formation</a-button>
          </div>
          <a-table :columns="colonnesFormations" :data-source="formations" :loading="chargementFormations" row-key="id" :pagination="false">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'organisme'">{{ (record as Formation).organisme ?? '—' }}</template>
              <template v-else-if="column.key === 'dateDebut'">{{ new Date((record as Formation).dateDebut).toLocaleDateString('fr-SN') }}</template>
              <template v-else-if="column.key === 'dateFin'">{{ (record as Formation).dateFin ? new Date((record as Formation).dateFin!).toLocaleDateString('fr-SN') : '—' }}</template>
              <template v-else-if="column.key === 'statut'">
                <a-tag :color="COULEUR_FORMATION[(record as Formation).statut]">{{ (record as Formation).statut }}</a-tag>
              </template>
            </template>
          </a-table>
        </template>

        <template v-if="employeContrat">
          <a-divider />
          <div class="entete">
            <h3>Contrats de {{ employeContrat.prenom }} {{ employeContrat.nom }}</h3>
            <a-button v-if="peutGerer" @click="modalContratOuvert = true">Nouveau contrat</a-button>
          </div>
          <a-table :columns="colonnesContrats" :data-source="contrats" :loading="chargementContrats" row-key="id" :pagination="false">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'type'">{{ LIBELLE_CONTRAT[(record as ContratTravail).type] }}</template>
              <template v-else-if="column.key === 'dateDebut'">{{ new Date((record as ContratTravail).dateDebut).toLocaleDateString('fr-SN') }}</template>
              <template v-else-if="column.key === 'dateFin'">{{ (record as ContratTravail).dateFin ? new Date((record as ContratTravail).dateFin!).toLocaleDateString('fr-SN') : 'En cours' }}</template>
              <template v-else-if="column.key === 'salaireBase'">{{ (record as ContratTravail).salaireBase.toLocaleString('fr-SN') }} FCFA</template>
              <template v-else-if="column.key === 'statut'">
                <a-tag :color="COULEUR_CONTRAT_STATUT[(record as ContratTravail).statut]">{{ (record as ContratTravail).statut }}</a-tag>
              </template>
            </template>
          </a-table>
        </template>
      </a-tab-pane>
    </a-tabs>

    <!-- MODALS ──────────────────────────────────────────────────────────────── -->

    <a-modal v-model:open="modalEmployeOuvert" :title="editEmployeId ? 'Modifier l\'employé' : 'Nouvel employé'" :confirm-loading="enregistrementEmploye" @ok="soumettreEmploye">
      <a-form layout="vertical">
        <a-form-item label="Matricule"><a-input v-model:value="formulaireEmploye.matricule" placeholder="EMP-001" /></a-form-item>
        <a-form-item label="Nom"><a-input v-model:value="formulaireEmploye.nom" /></a-form-item>
        <a-form-item label="Prénom"><a-input v-model:value="formulaireEmploye.prenom" /></a-form-item>
        <a-form-item label="Poste"><a-input v-model:value="formulaireEmploye.poste" placeholder="Infirmier chef" /></a-form-item>
        <a-form-item label="Date d'embauche"><a-input v-model:value="formulaireEmploye.dateEmbauche" type="date" /></a-form-item>
        <a-form-item label="Téléphone (optionnel)"><a-input v-model:value="formulaireEmploye.telephone" placeholder="+221 77 000 00 00" /></a-form-item>
        <a-form-item label="Email (optionnel)"><a-input v-model:value="formulaireEmploye.email" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="modalCongeOuvert" title="Demande de congé" :confirm-loading="enregistrementConge" @ok="soumettreConge">
      <a-form layout="vertical">
        <a-form-item label="Type">
          <a-select v-model:value="formulaireConge.type">
            <a-select-option v-for="t in Object.values(CongeType)" :key="t" :value="t">{{ LIBELLE_CONGE_TYPE[t] }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Du"><a-input v-model:value="formulaireConge.dateDebut" type="date" /></a-form-item>
        <a-form-item label="Au"><a-input v-model:value="formulaireConge.dateFin" type="date" /></a-form-item>
        <a-form-item label="Nombre de jours"><a-input-number v-model:value="formulaireConge.nombreJours" :min="1" style="width:100%" /></a-form-item>
        <a-form-item label="Motif (optionnel)"><a-textarea v-model:value="formulaireConge.motif" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="modalPresenceOuvert" title="Pointage" :confirm-loading="enregistrementPresence" @ok="soumettrePresence">
      <a-form layout="vertical">
        <a-form-item label="Date"><a-input v-model:value="formulairePresence.date" type="date" /></a-form-item>
        <a-form-item label="Statut">
          <a-select v-model:value="formulairePresence.statut">
            <a-select-option v-for="s in Object.values(PresenceStatut)" :key="s" :value="s">{{ LIBELLE_PRESENCE[s] }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Heure d'arrivée (optionnel)"><a-input v-model:value="formulairePresence.heureArrivee" placeholder="08:00" /></a-form-item>
        <a-form-item label="Heure de départ (optionnel)"><a-input v-model:value="formulairePresence.heureDepart" placeholder="17:00" /></a-form-item>
        <a-form-item label="Commentaire"><a-input v-model:value="formulairePresence.commentaire" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="modalFormationOuvert" title="Formation" :confirm-loading="enregistrementFormation" @ok="soumettreFormation">
      <a-form layout="vertical">
        <a-form-item label="Intitulé"><a-input v-model:value="formulaireFormation.intitule" /></a-form-item>
        <a-form-item label="Organisme (optionnel)"><a-input v-model:value="formulaireFormation.organisme" /></a-form-item>
        <a-form-item label="Date de début"><a-input v-model:value="formulaireFormation.dateDebut" type="date" /></a-form-item>
        <a-form-item label="Date de fin (optionnel)"><a-input v-model:value="formulaireFormation.dateFin" type="date" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="modalContratOuvert" title="Contrat de travail" :confirm-loading="enregistrementContrat" @ok="soumettreContrat">
      <a-form layout="vertical">
        <a-form-item label="Type">
          <a-select v-model:value="formulaireContrat.type">
            <a-select-option v-for="t in Object.values(ContratTravailType)" :key="t" :value="t">{{ LIBELLE_CONTRAT[t] }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Date de début"><a-input v-model:value="formulaireContrat.dateDebut" type="date" /></a-form-item>
        <a-form-item label="Date de fin (optionnel)"><a-input v-model:value="formulaireContrat.dateFin" type="date" /></a-form-item>
        <a-form-item label="Salaire de base (FCFA)"><a-input-number v-model:value="formulaireContrat.salaireBase" :min="0" style="width:100%" /></a-form-item>
      </a-form>
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
