<script setup lang="ts">
import { Scope } from '@sih-saas/shared';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';

const router = useRouter();
const auth = useAuthStore();

const formulaire = reactive({ email: '', motDePasse: '' });
const enCours = ref(false);
const erreur = ref<string | null>(null);

async function soumettre(): Promise<void> {
  erreur.value = null;
  enCours.value = true;
  try {
    await auth.login(formulaire.email, formulaire.motDePasse);
    await router.push({ name: auth.scope === Scope.PLATFORM ? 'platform-dashboard' : 'etablissement-dashboard' });
  } catch (e) {
    erreur.value = e instanceof Error ? e.message : 'Identifiants invalides.';
  } finally {
    enCours.value = false;
  }
}
</script>

<template>
  <div class="conteneur">
    <a-card title="SIH SaaS — Connexion" class="carte">
      <a-alert v-if="erreur" type="error" :message="erreur" show-icon style="margin-bottom: 16px" />
      <a-form layout="vertical" @finish="soumettre">
        <a-form-item label="Adresse e-mail">
          <a-input v-model:value="formulaire.email" type="email" autocomplete="username" placeholder="vous@etablissement.sn" />
        </a-form-item>
        <a-form-item label="Mot de passe">
          <a-input-password v-model:value="formulaire.motDePasse" autocomplete="current-password" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="enCours" block>
            Se connecter
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<style scoped>
.conteneur {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f0f2f5;
}

.carte {
  width: 380px;
}
</style>
