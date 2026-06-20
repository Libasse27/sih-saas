#!/bin/sh
# Équivalent production de postgres-init/01-create-app-role.sql (dev) — mot de passe lu depuis
# l'environnement du conteneur (SIH_SAAS_APP_PASSWORD, voir docker-compose.prod.yml) plutôt que
# codé en dur, puisque ce script est exécuté en production. Même rôle non-superuser, même raison
# (PostgreSQL ignore toujours RLS pour un superuser) — voir docs/phase-0/strategie-isolation.md §2.
set -e

if [ -z "$SIH_SAAS_APP_PASSWORD" ]; then
  echo "SIH_SAAS_APP_PASSWORD est requis pour initialiser le rôle applicatif." >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE sih_saas_app WITH LOGIN PASSWORD '${SIH_SAAS_APP_PASSWORD}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB} TO sih_saas_app;
EOSQL
