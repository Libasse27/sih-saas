<script setup lang="ts">
import { Scope } from '@sih-saas/shared';
import { onMounted, onUnmounted, ref } from 'vue';
import * as messagingService from '../../services/messaging.service';
import type { Conversation, Message } from '../../services/messaging.service';
import { obtenirSocket } from '../../services/realtime';

const conversations = ref<Conversation[]>([]);
const chargementConversations = ref(false);
const conversationSelectionnee = ref<Conversation | null>(null);

const messages = ref<Message[]>([]);
const chargementMessages = ref(false);
const nouveauMessage = ref('');
const envoiEnCours = ref(false);

async function chargerConversations(): Promise<void> {
  chargementConversations.value = true;
  try {
    conversations.value = await messagingService.findConversations();
  } finally {
    chargementConversations.value = false;
  }
}

async function ouvrirConversation(conversation: Conversation): Promise<void> {
  conversationSelectionnee.value = conversation;
  chargementMessages.value = true;
  try {
    const resultat = await messagingService.findMessages(conversation.id, 1, 50);
    messages.value = resultat.items;
  } finally {
    chargementMessages.value = false;
  }
}

async function envoyer(): Promise<void> {
  const texte = nouveauMessage.value.trim();
  if (!texte || !conversationSelectionnee.value) return;
  envoiEnCours.value = true;
  try {
    await messagingService.envoyerMessage(conversationSelectionnee.value.id, texte);
    nouveauMessage.value = '';
    await ouvrirConversation(conversationSelectionnee.value);
  } finally {
    envoiEnCours.value = false;
  }
}

function onMessageRecu(payload: { conversationId: string }): void {
  void chargerConversations();
  if (conversationSelectionnee.value?.id === payload.conversationId) {
    void ouvrirConversation(conversationSelectionnee.value);
  }
}

onMounted(() => {
  void chargerConversations();
  obtenirSocket()?.on('message:nouveau', onMessageRecu);
});

onUnmounted(() => {
  obtenirSocket()?.off('message:nouveau', onMessageRecu);
});
</script>

<template>
  <div class="conteneur">
    <a-card title="Conversations" class="liste-conversations" :loading="chargementConversations">
      <a-list :data-source="conversations" :locale="{ emptyText: 'Aucune conversation pour le moment.' }">
        <template #renderItem="{ item }">
          <a-list-item
            class="conversation-item"
            :class="{ active: conversationSelectionnee?.id === item.id }"
            @click="ouvrirConversation(item)"
          >
            <a-list-item-meta
              :description="item.dernierMessageAt ? new Date(item.dernierMessageAt).toLocaleString('fr-SN') : 'Aucun message.'"
            >
              <template #title>{{ item.patientNom }}</template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </a-card>

    <a-card title="Conversation" class="fil-discussion">
      <a-empty v-if="!conversationSelectionnee" description="Sélectionnez une conversation." />
      <template v-else>
        <a-spin :spinning="chargementMessages">
          <div class="messages">
            <div
              v-for="message in [...messages].reverse()"
              :key="message.id"
              class="bulle"
              :class="message.auteurScope === Scope.ETABLISSEMENT ? 'bulle-moi' : 'bulle-autre'"
            >
              <p>{{ message.contenu }}</p>
              <span class="horodatage">{{ new Date(message.createdAt).toLocaleString('fr-SN') }}</span>
            </div>
          </div>
        </a-spin>

        <a-space class="zone-saisie">
          <a-textarea v-model:value="nouveauMessage" :rows="2" placeholder="Écrire une réponse..." style="width: 400px" />
          <a-button type="primary" :loading="envoiEnCours" @click="envoyer">Envoyer</a-button>
        </a-space>
      </template>
    </a-card>
  </div>
</template>

<style scoped>
.conteneur {
  display: flex;
  gap: 16px;
  height: calc(100vh - 220px);
}
.liste-conversations {
  width: 320px;
  overflow-y: auto;
}
.fil-discussion {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.conversation-item {
  cursor: pointer;
  padding: 8px;
}
.conversation-item.active {
  background: #e6f4ff;
}
.messages {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.bulle {
  padding: 8px 12px;
  border-radius: 8px;
  max-width: 70%;
}
.bulle-moi {
  background: #1677ff;
  color: #fff;
  align-self: flex-end;
}
.bulle-autre {
  background: #f0f0f0;
  align-self: flex-start;
}
.horodatage {
  font-size: 11px;
  opacity: 0.7;
}
.zone-saisie {
  margin-top: auto;
}
</style>
