export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  // Base publique de l'API — utilisée pour construire les callbacks de webhook (notif_url Orange Money).
  apiPublicUrl: process.env.API_PUBLIC_URL ?? 'http://localhost:3000',
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
    // Absent en dev (conteneur sans --requirepass) — requis en prod (voir docker-compose.prod.yml).
    password: process.env.REDIS_PASSWORD,
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
    sandboxWebhookSecret: process.env.PAYMENT_SANDBOX_WEBHOOK_SECRET ?? 'sandbox-dev-secret-change-me',
    // Pages de retour après paiement (Wave success_url/error_url, Orange Money return_url/cancel_url).
    successUrl: process.env.PAYMENT_SUCCESS_URL ?? 'https://sih-saas.local/paiement/succes',
    errorUrl: process.env.PAYMENT_ERROR_URL ?? 'https://sih-saas.local/paiement/echec',
    // Wave Business Checkout (Phase 17) — https://docs.wave.com/checkout. Aucune vraie credential
    // fournie encore : volontairement undefined tant que WAVE_API_KEY n'est pas renseignée.
    wave: {
      apiKey: process.env.WAVE_API_KEY,
      webhookSecret: process.env.WAVE_WEBHOOK_SECRET,
    },
    // Orange Money Web Payment (Phase 17) — contrat reconstruit depuis des SDK tiers (pas de doc
    // partenaire officielle accessible), à reconfirmer dès l'obtention d'un vrai accès partenaire.
    orangeMoney: {
      clientId: process.env.ORANGE_MONEY_CLIENT_ID,
      clientSecret: process.env.ORANGE_MONEY_CLIENT_SECRET,
      merchantKey: process.env.ORANGE_MONEY_MERCHANT_KEY,
      env: process.env.ORANGE_MONEY_ENV ?? 'dev',
    },
    // Stripe (Phase 32) — https://docs.stripe.com/api/checkout/sessions/create. Sert aussi
    // PaymentProviderType.CARTE (alias, voir PaymentGatewayRegistry) ; support réel du XOF non
    // confirmé par Stripe, voir la réserve en tête de stripe-payment-gateway.ts.
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
  },
});
