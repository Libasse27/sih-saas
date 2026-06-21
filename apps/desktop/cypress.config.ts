import { defineConfig } from 'cypress';

// Suppose pnpm dev (Vite, port 5173) ET l'API (port 3000, voir apps/api/.env.example) déjà
// lancées — ce fichier ne démarre rien lui-même, même principe que verify-gui.mjs (Phase 15/21) :
// rester utilisable aussi bien en local qu'en CI sans dupliquer la logique de démarrage des serveurs.
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: false,
    // Plus généreux que le défaut Cypress (4000) : cet environnement de dev fait tourner API +
    // Postgres + Mongo + Redis + Vite + le navigateur Cypress simultanément, des requêtes qui
    // prennent élargissez 1-2s en conditions normales peuvent dépasser largement ce délai ici
    // (observé : un round-trip /auth/login a déjà pris plus de 10s pendant le diagnostic Phase 25).
    defaultCommandTimeout: 20000,
  },
  env: {
    apiBaseUrl: process.env.CYPRESS_API_BASE_URL ?? 'http://localhost:3000/api',
  },
});
