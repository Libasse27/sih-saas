<script setup lang="ts">
import {
  AppstoreOutlined,
  BankOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  GiftOutlined,
  LogoutOutlined,
  SettingOutlined,
  TagsOutlined,
} from '@ant-design/icons-vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const menuItems = [
  { key: 'platform-dashboard', label: 'Tableau de bord', icon: DashboardOutlined },
  { key: 'platform-etablissements', label: 'Établissements', icon: BankOutlined },
  { key: 'platform-plans', label: 'Forfaits', icon: AppstoreOutlined },
  { key: 'platform-coupons', label: 'Coupons', icon: TagsOutlined },
  { key: 'platform-promotions', label: 'Promotions', icon: GiftOutlined },
  { key: 'platform-parametres', label: 'Paramètres', icon: SettingOutlined },
  { key: 'platform-audit', label: 'Audit', icon: FileSearchOutlined },
];

const selectedKeys = computed<string[]>(() => {
  // La fiche détail d'un établissement doit garder "Établissements" sélectionné dans le menu.
  if (route.name === 'platform-etablissement-detail') {
    return ['platform-etablissements'];
  }
  return [String(route.name)];
});

function onMenuClick({ key }: { key: string }): void {
  void router.push({ name: key });
}

async function seDeconnecter(): Promise<void> {
  await auth.logout();
  await router.push({ name: 'login' });
}
</script>

<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider>
      <div class="logo">SIH SaaS</div>
      <a-menu theme="dark" mode="inline" :selected-keys="selectedKeys" @click="onMenuClick">
        <a-menu-item v-for="item in menuItems" :key="item.key">
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="header">
        <span class="titre">Console plateforme</span>
        <span class="utilisateur">
          {{ auth.nomComplet }}
          <a-button type="link" @click="seDeconnecter"><LogoutOutlined /> Déconnexion</a-button>
        </span>
      </a-layout-header>
      <a-layout-content class="contenu">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.logo {
  color: #fff;
  font-weight: 600;
  text-align: center;
  padding: 16px;
  font-size: 18px;
}
.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.titre {
  font-weight: 600;
  font-size: 16px;
}
.utilisateur {
  display: flex;
  align-items: center;
  gap: 8px;
}
.contenu {
  margin: 24px;
  padding: 24px;
  background: #fff;
  min-height: 280px;
}
</style>
