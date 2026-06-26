<script setup lang="ts">
import { Permission, SalleOperationStatut } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as blocService from '../../services/bloc-operatoire.service';
import type { SalleOperation } from '../../services/bloc-operatoire.service';
import { useAuthStore } from '../../stores/auth.store';

const auth = useAuthStore();
const peutGerer = auth.aPermission(Permission.ETABLISSEMENT_SETTINGS);

const LIBELLE_STATUT: Record<SalleOperationStatut, string> = {
  [SalleOperationStatut.LIBRE]: 'Libre',
  [SalleOperationStatut.OCCUPEE]: 'Occupée',
  [SalleOperationStatut.MAINTENANCE]: 'Maintenance',
};

const COULEUR_STATUT: Record<SalleOperationStatut, string> = {
  [SalleOperationStatut.LIBRE]: 'green',
  [SalleOperationStatut.OCCUPEE]: 'red',
  [SalleOperationStatut.MAINTENANCE]: 'orange',
};

const salles = ref<SalleOperation[]>([]);
const chargement = ref(false);
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const modalOuvert = ref(false);
const enregistrement = ref(false);
const editId = ref<string | null>(null);
const formulaire = reactive({ nom: '', equipement: '' });

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const res = await blocService.findAllSalles(pagination.page, pagination.limit);
    salles.value = res.items;
    pagination.total = res.total;
  } finally {
    chargement.value = false;
  }
}

function ouvrirCreation(): void {
  editId.value = null;
  formulaire.nom = '';
  formulaire.equipement = '';
  modalOuvert.value = true;
}

function ouvrirEdition(salle: SalleOperation): void {
  editId.value = salle.id;
  formulaire.nom = salle.nom;
  formulaire.equipement = salle.equipement ?? '';
  modalOuvert.value = true;
}

async function soumettre(): Promise<void> {
  if (!formulaire.nom.trim()) {
    message.warning('Le nom de la salle est obligatoire.');
    return;
  }
  enregistrement.value = true;
  try {
    const dto = { nom: formulaire.nom.trim(), equipement: formulaire.equipement.trim() || undefined };
    if (editId.value) {
      await blocService.updateSalle(editId.value, dto);
      message.success('Salle mise à jour.');
    } else {
      await blocService.createSalle(dto);
      message.success("Salle d'opération créée.");
    }
    modalOuvert.value = false;
    await charger();
  } finally {
    enregistrement.value = false;
  }
}

onMounted(charger);
</script>

<template>
  <div>
    <div class="entete">
      <h2>Salles d'opération</h2>
      <a-button v-if="peutGerer" type="primary" @click="ouvrirCreation">Nouvelle salle</a-button>
    </div>

    <a-spin :spinning="chargement">
      <a-row :gutter="[16, 16]">
        <a-col v-for="salle in salles" :key="salle.id" :xs="24" :sm="12" :md="8" :lg="6">
          <a-card>
            <template #title>
              <a-tag :color="COULEUR_STATUT[salle.statut]">{{ LIBELLE_STATUT[salle.statut] }}</a-tag>
              {{ salle.nom }}
            </template>
            <template v-if="peutGerer" #extra>
              <a-button size="small" @click="ouvrirEdition(salle)">Modifier</a-button>
            </template>
            <p style="color: #666; margin: 0">
              {{ salle.equipement ?? '—' }}
            </p>
          </a-card>
        </a-col>
        <a-col v-if="!chargement && salles.length === 0" :span="24">
          <a-empty description="Aucune salle d'opération configurée" />
        </a-col>
      </a-row>

      <div v-if="pagination.total > pagination.limit" style="margin-top: 16px; text-align: right">
        <a-pagination
          :current="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          @change="(p: number) => { pagination.page = p; void charger(); }"
        />
      </div>
    </a-spin>

    <a-modal
      v-model:open="modalOuvert"
      :title="editId ? 'Modifier la salle' : 'Nouvelle salle d\'opération'"
      :confirm-loading="enregistrement"
      @ok="soumettre"
    >
      <a-form layout="vertical">
        <a-form-item label="Nom de la salle">
          <a-input v-model:value="formulaire.nom" placeholder="Salle 1" />
        </a-form-item>
        <a-form-item label="Équipements (optionnel)">
          <a-input v-model:value="formulaire.equipement" placeholder="Table opératoire, bistouri électrique..." />
        </a-form-item>
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
