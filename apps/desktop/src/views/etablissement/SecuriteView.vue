<script setup lang="ts">
import { message } from 'ant-design-vue';
import QRCode from 'qrcode';
import { onMounted, ref } from 'vue';
import * as authService from '../../services/auth.service';
import * as mfaService from '../../services/mfa.service';

const chargement = ref(true);
const mfaEnabled = ref(false);

// Étape 1/2 de l'activation : secret généré, QR affiché, en attente de confirmation par un code.
const activationEnCours = ref(false);
const qrCodeDataUrl = ref<string | null>(null);
const secretManuel = ref<string | null>(null);
const codeConfirmation = ref('');
const confirmationEnCours = ref(false);

const modalDesactivationOuvert = ref(false);
const codeDesactivation = ref('');
const desactivationEnCours = ref(false);

async function chargerStatut(): Promise<void> {
  chargement.value = true;
  try {
    const profil = await authService.me();
    mfaEnabled.value = profil.mfaEnabled;
  } finally {
    chargement.value = false;
  }
}

async function demarrerActivation(): Promise<void> {
  const resultat = await mfaService.activer();
  secretManuel.value = resultat.secret;
  qrCodeDataUrl.value = await QRCode.toDataURL(resultat.otpauthUri);
  codeConfirmation.value = '';
  activationEnCours.value = true;
}

async function confirmerActivation(): Promise<void> {
  confirmationEnCours.value = true;
  try {
    await mfaService.verifier(codeConfirmation.value);
    message.success('MFA activé avec succès.');
    activationEnCours.value = false;
    qrCodeDataUrl.value = null;
    secretManuel.value = null;
    await chargerStatut();
  } finally {
    confirmationEnCours.value = false;
  }
}

function annulerActivation(): void {
  activationEnCours.value = false;
  qrCodeDataUrl.value = null;
  secretManuel.value = null;
}

async function confirmerDesactivation(): Promise<void> {
  desactivationEnCours.value = true;
  try {
    await mfaService.desactiver(codeDesactivation.value);
    message.success('MFA désactivé.');
    modalDesactivationOuvert.value = false;
    codeDesactivation.value = '';
    await chargerStatut();
  } finally {
    desactivationEnCours.value = false;
  }
}

onMounted(chargerStatut);
</script>

<template>
  <div>
    <h2>Sécurité</h2>

    <a-card title="Double authentification (MFA)" :loading="chargement" style="max-width: 480px">
      <template v-if="!activationEnCours">
        <p>
          Statut :
          <a-tag :color="mfaEnabled ? 'green' : 'default'">{{ mfaEnabled ? 'Activé' : 'Désactivé' }}</a-tag>
        </p>
        <a-button v-if="!mfaEnabled" type="primary" @click="demarrerActivation">Activer le MFA</a-button>
        <a-button v-else danger @click="modalDesactivationOuvert = true">Désactiver le MFA</a-button>
      </template>

      <template v-else>
        <p>Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy, etc.) :</p>
        <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="QR code MFA" style="display: block; margin: 0 auto 16px" />
        <a-typography-paragraph>
          Ou saisissez ce secret manuellement : <a-typography-text copyable code>{{ secretManuel }}</a-typography-text>
        </a-typography-paragraph>
        <a-form-item label="Code à 6 chiffres affiché par l'application">
          <a-input v-model:value="codeConfirmation" placeholder="123456" maxlength="6" />
        </a-form-item>
        <a-space>
          <a-button type="primary" :loading="confirmationEnCours" @click="confirmerActivation">Confirmer</a-button>
          <a-button @click="annulerActivation">Annuler</a-button>
        </a-space>
      </template>
    </a-card>

    <a-modal
      v-model:open="modalDesactivationOuvert"
      title="Désactiver le MFA"
      :confirm-loading="desactivationEnCours"
      @ok="confirmerDesactivation"
    >
      <p>Saisissez un code valide de votre application d'authentification pour confirmer la désactivation.</p>
      <a-input v-model:value="codeDesactivation" placeholder="123456" maxlength="6" />
    </a-modal>
  </div>
</template>
