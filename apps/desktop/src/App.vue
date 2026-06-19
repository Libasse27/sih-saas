<script setup lang="ts">
import frFR from 'ant-design-vue/es/locale/fr_FR';
</script>

<template>
  <a-config-provider :locale="frFR">
    <router-view />
  </a-config-provider>
</template>
