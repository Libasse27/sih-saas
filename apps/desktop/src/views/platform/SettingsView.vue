<script setup lang="ts">
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import * as settingsService from '../../services/settings.service';

const formulaire = reactive({
  nomExpediteur: '',
  emailExpediteur: '',
  emailSupport: '',
  paiementsActifs: true,
});

const chargement = ref(true);
const enregistrement = ref(false);

async function charger(): Promise<void> {
  chargement.value = true;
  try {
    const settings = await settingsService.get();
    formulaire.nomExpediteur = settings.email.nomExpediteur ?? '';
    formulaire.emailExpediteur = settings.email.emailExpediteur ?? '';
    formulaire.emailSupport = settings.email.emailSupport ?? '';
    formulaire.paiementsActifs = settings.paiements.actifs;
  } finally {
    chargement.value = false;
  }
}

async function soumettre(): Promise<void> {
  enregistrement.value = true;
  try {
    await settingsService.update({
      email: {
        nomExpediteur: formulaire.nomExpediteur || null,
        emailExpediteur: formulaire.emailExpediteur || null,
        emailSupport: formulaire.emailSupport || null,
      },
      paiements: { actifs: formulaire.paiementsActifs },
    });
    message.success('Paramètres mis à jour.');
  } finally {
    enregistrement.value = false;
  }
}

onMounted(charger);
</script>

<template>
  <div>
    <h2>Paramètres plateforme</h2>

    <a-spin :spinning="chargement">
      <a-form layout="vertical" style="max-width: 480px" @finish="soumettre">
        <a-divider>Emails sortants</a-divider>
        <a-form-item label="Nom de l'expéditeur">
          <a-input v-model:value="formulaire.nomExpediteur" placeholder="SIH SaaS" />
        </a-form-item>
        <a-form-item label="Adresse d'expédition">
          <a-input v-model:value="formulaire.emailExpediteur" placeholder="no-reply@sih-saas.sn" />
        </a-form-item>
        <a-form-item label="Adresse de support (affichée aux établissements)">
          <a-input v-model:value="formulaire.emailSupport" placeholder="support@sih-saas.sn" />
        </a-form-item>

        <a-divider>Paiements d'abonnement</a-divider>
        <a-form-item label="Paiements actifs">
          <a-switch v-model:checked="formulaire.paiementsActifs" />
          <span class="aide">
            Coupe-circuit pour les nouveaux abonnements/renouvellements uniquement — n'affecte jamais la facturation
            des soins aux patients.
          </span>
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="enregistrement">Enregistrer</a-button>
        </a-form-item>
      </a-form>
    </a-spin>
  </div>
</template>

<style scoped>
.aide {
  margin-left: 12px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
