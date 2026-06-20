import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// Renderer Vite — le process Electron (electron/main.ts, electron/preload.ts) est compilé séparément par tsc (tsconfig.node.json).
export default defineConfig({
  plugins: [vue()],
  base: './', // chemins relatifs indispensables pour le chargement via file:// dans le paquet Electron
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    // Le seuil par défaut de Rollup (500 kB) cible des pages web servies sur réseau lent — non
    // pertinent ici : ce bundle est chargé une fois depuis le disque local par Electron (file://),
    // jamais retéléchargé par l'utilisateur final. On le relève plutôt que de masquer une vraie
    // régression future avec un seuil sans rapport avec ce mode de livraison.
    chunkSizeWarningLimit: 1700,
    rollupOptions: {
      output: {
        // Sépare les grosses dépendances tierces de l'application elle-même : meilleure lisibilité
        // des rapports de build et re-téléchargement plus ciblé en dev (HMR) — le poids total
        // chargé au démarrage ne change pas, ant-design-vue restant enregistré globalement
        // (`app.use(Antd)` dans main.ts, jamais converti en imports par composant).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('ant-design-vue') || id.includes('@ant-design')) return 'vendor-antd';
          if (id.includes('chart.js') || id.includes('vue-chartjs')) return 'vendor-charts';
          if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'vendor-realtime';
          if (id.includes('/vue/') || id.includes('vue-router') || id.includes('pinia')) return 'vendor-vue';
          return 'vendor';
        },
      },
    },
  },
});
