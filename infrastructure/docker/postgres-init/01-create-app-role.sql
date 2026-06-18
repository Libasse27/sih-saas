-- Rôle applicatif NON superutilisateur, utilisé par le backend (migrations + runtime).
--
-- Pourquoi : PostgreSQL ignore TOUJOURS les policies RLS pour un rôle superuser, que
-- FORCE ROW LEVEL SECURITY soit activé ou non. Le rôle créé par POSTGRES_USER dans l'image
-- Docker officielle Postgres est superuser par défaut — il ne doit donc servir qu'au bootstrap
-- du conteneur, jamais aux connexions applicatives. Voir docs/phase-0/strategie-isolation.md §2.
--
-- Ce script ne s'exécute qu'à la toute première initialisation du volume Postgres
-- (mécanisme /docker-entrypoint-initdb.d/ de l'image officielle).
CREATE ROLE sih_saas_app WITH LOGIN PASSWORD 'sih_saas_app_dev_password' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
GRANT ALL PRIVILEGES ON DATABASE sih_saas TO sih_saas_app;
