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
  },
});
