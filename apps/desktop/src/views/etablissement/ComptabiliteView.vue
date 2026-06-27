<script setup lang="ts">
import { JournalCode, Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, ref } from 'vue';
import { useAuthStore } from '../../stores/auth.store';
import * as comptabiliteService from '../../services/comptabilite.service';
import type { BalanceLigne, EcritureComptable } from '../../services/comptabilite.service';

const auth = useAuthStore();
const peutEcrire = auth.aPermission(Permission.COMPTA_JOURNAL_WRITE);

// ── Journal ───────────────────────────────────────────────────────────────────

const chargementJournal = ref(false);
const ecritures = ref<EcritureComptable[]>([]);
const filtreJournal = ref<JournalCode | undefined>(undefined);
const filtreDateDebut = ref<string>('');
const filtreDateFin = ref<string>('');

const colonnesJournal = [
  { title: 'Date', dataIndex: 'date', key: 'date', width: 110 },
  { title: 'Journal', dataIndex: 'journalCode', key: 'journalCode', width: 80 },
  { title: 'N°', dataIndex: 'numero', key: 'numero', width: 140 },
  { title: 'Libellé', dataIndex: 'libelle', key: 'libelle' },
  { title: 'Cpte débit', dataIndex: 'compteDebitCode', key: 'compteDebitCode', width: 90 },
  { title: 'Débit', dataIndex: 'montantDebit', key: 'montantDebit', width: 120, align: 'right' as const },
  { title: 'Cpte crédit', dataIndex: 'compteCreditCode', key: 'compteCreditCode', width: 90 },
  { title: 'Crédit', dataIndex: 'montantCredit', key: 'montantCredit', width: 120, align: 'right' as const },
  { title: 'Pièce réf.', dataIndex: 'pieceRef', key: 'pieceRef', width: 160 },
];

async function chargerJournal() {
  chargementJournal.value = true;
  try {
    ecritures.value = await comptabiliteService.getJournal({
      dateDebut: filtreDateDebut.value || undefined,
      dateFin: filtreDateFin.value || undefined,
      journalCode: filtreJournal.value,
    });
  } finally {
    chargementJournal.value = false;
  }
}

// ── Balance ───────────────────────────────────────────────────────────────────

const chargementBalance = ref(false);
const balance = ref<BalanceLigne[]>([]);

const colonnesBalance = [
  { title: 'Code', dataIndex: 'code', key: 'code', width: 90 },
  { title: 'Libellé', dataIndex: 'libelle', key: 'libelle' },
  { title: 'Classe', dataIndex: 'classe', key: 'classe', width: 70 },
  { title: 'Total débit', dataIndex: 'totalDebit', key: 'totalDebit', width: 130, align: 'right' as const },
  { title: 'Total crédit', dataIndex: 'totalCredit', key: 'totalCredit', width: 130, align: 'right' as const },
  { title: 'Solde', dataIndex: 'solde', key: 'solde', width: 130, align: 'right' as const },
];

async function chargerBalance() {
  chargementBalance.value = true;
  try {
    balance.value = await comptabiliteService.getBalance();
  } finally {
    chargementBalance.value = false;
  }
}

// ── Saisie OD ─────────────────────────────────────────────────────────────────

const modalOd = ref(false);
const enregistrementOd = ref(false);
const formOd = ref({
  date: new Date().toISOString().split('T')[0],
  libelle: '',
  compteDebitCode: '',
  montantDebit: 0,
  compteCreditCode: '',
  montantCredit: 0,
});

async function soumettreOD() {
  enregistrementOd.value = true;
  try {
    await comptabiliteService.creerEcritureOD(formOd.value);
    message.success('Écriture OD enregistrée.');
    modalOd.value = false;
    await chargerJournal();
  } catch {
    message.error("Erreur lors de l'enregistrement de l'OD.");
  } finally {
    enregistrementOd.value = false;
  }
}

function formaterFcfa(montant: number): string {
  return new Intl.NumberFormat('fr-SN', { maximumFractionDigits: 0 }).format(montant) + ' FCFA';
}

onMounted(() => {
  chargerJournal();
  chargerBalance();
});
</script>

<template>
  <a-tabs default-active-key="journal">
    <a-tab-pane key="journal" tab="Journal des écritures">
      <a-row :gutter="8" style="margin-bottom: 12px" align="middle">
        <a-col>
          <a-select
            v-model:value="filtreJournal"
            allow-clear
            placeholder="Tous les journaux"
            style="width: 180px"
          >
            <a-select-option v-for="j in Object.values(JournalCode)" :key="j" :value="j">{{ j }}</a-select-option>
          </a-select>
        </a-col>
        <a-col>
          <a-input v-model:value="filtreDateDebut" type="date" placeholder="Du" style="width: 145px" />
        </a-col>
        <a-col>
          <a-input v-model:value="filtreDateFin" type="date" placeholder="Au" style="width: 145px" />
        </a-col>
        <a-col>
          <a-button @click="chargerJournal" :loading="chargementJournal">Filtrer</a-button>
        </a-col>
        <a-col flex="auto" style="text-align: right">
          <a-button v-if="peutEcrire" type="primary" data-cy="compta-btn-saisir-od" @click="modalOd = true">Saisir une OD</a-button>
        </a-col>
      </a-row>

      <a-table
        data-cy="compta-table-journal"
        :data-source="ecritures"
        :columns="colonnesJournal"
        :loading="chargementJournal"
        :pagination="{ pageSize: 50 }"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'montantDebit' || column.key === 'montantCredit'">
            {{ formaterFcfa((record as EcritureComptable)[column.key as 'montantDebit' | 'montantCredit']) }}
          </template>
        </template>
      </a-table>
    </a-tab-pane>

    <a-tab-pane key="balance" tab="Balance des comptes">
      <a-button @click="chargerBalance" :loading="chargementBalance" style="margin-bottom: 12px">
        Actualiser
      </a-button>
      <a-table
        data-cy="compta-table-balance"
        :data-source="balance"
        :columns="colonnesBalance"
        :loading="chargementBalance"
        :pagination="false"
        row-key="code"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'totalDebit' || column.key === 'totalCredit' || column.key === 'solde'">
            <span :style="column.key === 'solde' && (record as BalanceLigne).solde < 0 ? { color: '#ff4d4f' } : {}">
              {{ formaterFcfa((record as BalanceLigne)[column.key as 'totalDebit' | 'totalCredit' | 'solde']) }}
            </span>
          </template>
        </template>
      </a-table>
    </a-tab-pane>
  </a-tabs>

  <a-modal v-model:open="modalOd" title="Saisie d'une opération diverse (OD)" :confirm-loading="enregistrementOd" @ok="soumettreOD">
    <a-form layout="vertical">
      <a-form-item label="Date">
        <a-input v-model:value="formOd.date" type="date" />
      </a-form-item>
      <a-form-item label="Libellé">
        <a-input v-model:value="formOd.libelle" placeholder="Description de l'opération" data-cy="od-libelle" />
      </a-form-item>
      <a-row :gutter="8">
        <a-col :span="12">
          <a-form-item label="Compte débité (code)">
            <a-input v-model:value="formOd.compteDebitCode" placeholder="ex: 411" data-cy="od-compte-debit" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Montant débit (FCFA)">
            <a-input-number v-model:value="formOd.montantDebit" :min="1" style="width: 100%" data-cy="od-montant-debit" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="8">
        <a-col :span="12">
          <a-form-item label="Compte crédité (code)">
            <a-input v-model:value="formOd.compteCreditCode" placeholder="ex: 706" data-cy="od-compte-credit" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Montant crédit (FCFA)">
            <a-input-number v-model:value="formOd.montantCredit" :min="1" style="width: 100%" data-cy="od-montant-credit" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>
