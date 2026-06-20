export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  // Whitelist CORS (Phase 11) : la console desktop (Vite) en dev, le(s) domaine(s) de prod en liste séparée par virgules.
  // Pas de CORS pour le mobile (React Native n'exécute pas dans un contexte navigateur) ni pour les clés API FHIR (server-to-server).
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((origin) => origin.trim()),

  postgres: {
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  },

  mongodb: {
    uri: process.env.MONGODB_URI,
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
    loginMaxTentatives: parseInt(process.env.LOGIN_MAX_TENTATIVES ?? '5', 10),
    loginVerrouillageMinutes: parseInt(process.env.LOGIN_VERROUILLAGE_MINUTES ?? '15', 10),
  },

  mail: {
    transport: process.env.MAIL_TRANSPORT ?? 'dev', // 'dev' = jsonTransport (aucun envoi réseau), 'smtp' = réel
    from: process.env.MAIL_FROM ?? 'no-reply@sih-saas.local',
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT ?? '587', 10),
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
  },

  payments: {
    // Seule la passerelle SANDBOX est câblée pour l'instant — voir docs/phase-0/plan-de-phases.md Phase 4.
    sandboxWebhookSecret: process.env.PAYMENT_SANDBOX_WEBHOOK_SECRET ?? 'sandbox-dev-secret-change-me',
  },
});
