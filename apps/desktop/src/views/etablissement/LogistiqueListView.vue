<script setup lang="ts">
import { Permission } from '@sih-saas/shared';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as logistiqueService from '../../services/logistique.service';
import type { ArticleStock } from '../../services/logistique.service';
import { useAuthStore } from '../../stores/auth.store';

const auth = useAuthStore();
const peutGerer = auth.aPermission(Permission.STOCK_MANAGE);

const colonnes = [
  { title: 'Article', dataIndex: 'nom', key: 'nom' },
  { title: 'Catégorie', dataIndex: 'categorie', key: 'categorie' },
  { title: 'Quantité', key: 'quantite' },
  { title: 'Seuil d’alerte', dataIndex: 'seuilAlerte', key: 'seuilAlerte' },
  { title: 'Unité', dataIndex: 'unite', key: 'unite' },
];

const items = ref<ArticleStock[]>([]);
const chargement = ref(false);
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const modalOuvert = ref(false);
const enregistrement = ref(false);
const formulaire = reactive({ nom: '', categorie: '', quantite: 0, seuilAlerte: 0, unite: '' });

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const resultat = await logistiqueService.findAll(pagination.page, pagination.limit);
    items.value = resultat.items;
    pagination.total = resultat.total;
  } finally {
    chargement.value = false;
  }
}

function changerPage(page: number): void {
  pagination.page = page;
  void charger();
}

function ouvrirCreation(): void {
  formulaire.nom = '';
  formulaire.categorie = '';
  formulaire.quantite = 0;
  formulaire.seuilAlerte = 0;
  formulaire.unite = '';
  modalOuvert.value = true;
}

async function soumettre(): Promise<void> {
  enregistrement.value = true;
  try {
    await logistiqueService.create({
      nom: formulaire.nom,
      categorie: formulaire.categorie || undefined,
      quantite: formulaire.quantite,
      seuilAlerte: formulaire.seuilAlerte,
      unite: formulaire.unite,
    });
    message.success('Article de stock créé.');
    modalOuvert.value = false;
    await charger();
  } finally {
    enregistrement.value = false;
  }
}

async function changerQuantite(article: ArticleStock, quantite: number): Promise<void> {
  await logistiqueService.update(article.id, { quantite });
  message.success('Quantité mise à jour.');
  await charger();
}

onMounted(charger);
</script>

<template>
  <div>
    <div class="entete">
      <h2>Logistique</h2>
      <a-button v-if="peutGerer" type="primary" @click="ouvrirCreation">Nouvel article</a-button>
    </div>

    <a-table
      :columns="colonnes"
      :data-source="items"
      :loading="chargement"
      row-key="id"
      :pagination="{ current: pagination.page, pageSize: pagination.limit, total: pagination.total, onChange: changerPage }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'quantite'">
          <a-space>
            <a-input-number
              v-if="peutGerer"
              :value="record.quantite"
              :min="0"
              size="small"
              :status="record.quantite <= record.seuilAlerte ? 'warning' : undefined"
              @change="(valeur: number) => changerQuantite(record, valeur)"
            />
            <span v-else>{{ record.quantite }}</span>
            <a-tag v-if="record.quantite <= record.seuilAlerte" color="red">⚠ sous le seuil</a-tag>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="modalOuvert" title="Nouvel article de stock" :confirm-loading="enregistrement" @ok="soumettre">
      <a-form layout="vertical">
        <a-form-item label="Nom">
          <a-input v-model:value="formulaire.nom" placeholder="Gants nitrile" />
        </a-form-item>
        <a-form-item label="Catégorie">
          <a-input v-model:value="formulaire.categorie" placeholder="Consommables" />
        </a-form-item>
        <a-form-item label="Quantité">
          <a-input-number v-model:value="formulaire.quantite" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="Seuil d’alerte">
          <a-input-number v-model:value="formulaire.seuilAlerte" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="Unité">
          <a-input v-model:value="formulaire.unite" placeholder="boîte" />
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
