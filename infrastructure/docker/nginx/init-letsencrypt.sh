#!/usr/bin/env bash
set -euo pipefail

# Émission INITIALE du certificat Let's Encrypt — à exécuter UNE SEULE FOIS, manuellement, depuis
# la racine du repo, avant le tout premier démarrage de la stack prod (puis `certbot` se charge du
# renouvellement automatique, voir le service `certbot` de docker-compose.prod.yml). Adapté du
# pattern de référence https://github.com/wmnnd/nginx-certbot (certificat "factice" pour permettre
# à nginx de démarrer avant qu'un vrai certificat n'existe). Voir docs/tls-production.md.
#
# Jamais testé contre un vrai domaine dans cet environnement (même réserve que les passerelles
# Wave/Orange Money, docs/phase-0) — construit contre la documentation officielle certbot
# (https://eff-certbot.readthedocs.io/en/stable/using.html), à valider au premier déploiement réel.

: "${DOMAIN_NAME:?DOMAIN_NAME doit être défini (ex. export DOMAIN_NAME=sih-saas.example.com)}"
: "${CERTBOT_EMAIL:?CERTBOT_EMAIL doit être défini (ex. export CERTBOT_EMAIL=admin@example.com)}"

COMPOSE=(docker compose --env-file .env.production -f docker-compose.prod.yml)
RSA_KEY_SIZE=4096
LIVE_PATH="/etc/letsencrypt/live/${DOMAIN_NAME}"

echo "### [1/5] Certificat factice pour ${DOMAIN_NAME} (permet à nginx de démarrer une première fois)"
"${COMPOSE[@]}" run --rm --entrypoint sh certbot -c "
  mkdir -p '${LIVE_PATH}' &&
  openssl req -x509 -nodes -newkey rsa:${RSA_KEY_SIZE} -days 1 \
    -keyout '${LIVE_PATH}/privkey.pem' \
    -out '${LIVE_PATH}/fullchain.pem' \
    -subj '/CN=localhost'
"

echo "### [2/5] Démarrage de nginx avec le certificat factice"
"${COMPOSE[@]}" up --force-recreate -d nginx

echo "### [3/5] Suppression du certificat factice"
"${COMPOSE[@]}" run --rm --entrypoint sh certbot -c "
  rm -rf '/etc/letsencrypt/live/${DOMAIN_NAME}' \
         '/etc/letsencrypt/archive/${DOMAIN_NAME}' \
         '/etc/letsencrypt/renewal/${DOMAIN_NAME}.conf'
"

echo "### [4/5] Émission du vrai certificat Let's Encrypt (défi HTTP-01 via /var/www/certbot)"
"${COMPOSE[@]}" run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  --email "${CERTBOT_EMAIL}" -d "${DOMAIN_NAME}" \
  --rsa-key-size "${RSA_KEY_SIZE}" --agree-tos --no-eff-email

echo "### [5/5] Rechargement de nginx avec le vrai certificat"
"${COMPOSE[@]}" exec nginx nginx -s reload

echo "### Terminé. Le service 'certbot' renouvellera automatiquement ce certificat (boucle 'certbot renew' toutes les 12h)."
