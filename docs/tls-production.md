# TLS en production (chiffrement en transit)

> Comble le gap identifié à l'audit du 2026-06-21 (voir mémoire de session) : aucune configuration
> TLS n'existait avant cette phase, l'API étant exposée directement en HTTP sur le port hôte.
> **Jamais testé contre un vrai domaine** dans cet environnement de développement (même réserve que
> les passerelles de paiement Wave/Orange Money) — construit contre la documentation officielle
> nginx et certbot, à valider lors du premier déploiement réel.

## Principe

```
Internet ──443/80──▶ nginx (TLS) ──HTTP interne──▶ api:3000 (jamais exposé publiquement)
                         ▲
                         └── certbot (émission + renouvellement automatique Let's Encrypt)
```

- `nginx` est désormais le **seul** point d'entrée public (`docker-compose.prod.yml`, ports 80/443).
- Le service `api` ne publie plus son port que sur `127.0.0.1` (debug/tunnel SSH local au serveur),
  jamais sur l'interface publique.
- `certbot` tourne en boucle (`certbot renew` toutes les 12h) dans un conteneur dédié, volume partagé
  avec `nginx` pour les certificats (`/etc/letsencrypt`) et le défi HTTP-01 (`/var/www/certbot`).
- Le port 80 reste nécessaire en permanence : il sert le défi ACME et redirige tout le reste vers 443.

## Prérequis avant le premier déploiement

1. Un nom de domaine dont l'enregistrement DNS **A** pointe déjà vers l'IP publique du serveur.
2. `DOMAIN_NAME` et `CERTBOT_EMAIL` renseignés dans `.env.production` (racine du repo, voir
   `.env.production.example`).
3. Les ports 80 et 443 ouverts/accessibles depuis Internet sur ce serveur.

## Émission du premier certificat (une seule fois)

```bash
export DOMAIN_NAME=sih-saas.votre-domaine.sn
export CERTBOT_EMAIL=admin@votre-domaine.sn
./infrastructure/docker/nginx/init-letsencrypt.sh
```

Le script (`infrastructure/docker/nginx/init-letsencrypt.sh`) :
1. Génère un certificat **factice** auto-signé (sinon nginx refuse de démarrer, faute de
   `ssl_certificate` existant).
2. Démarre `nginx` avec ce certificat factice.
3. Le supprime.
4. Demande le **vrai** certificat à Let's Encrypt via le défi HTTP-01 (webroot).
5. Recharge `nginx` à chaud (`nginx -s reload`, sans interrompre les connexions existantes).

Ensuite, démarrer/réobtenir le reste de la stack normalement :

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## Renouvellement

Automatique — le service `certbot` de `docker-compose.prod.yml` exécute `certbot renew` toutes les
12h (Let's Encrypt ne renouvelle réellement qu'à moins de 30 jours de l'expiration, cet intervalle
est volontairement court pour ne jamais rater une fenêtre). `nginx` doit être rechargé après un
renouvellement réel pour reprendre le nouveau certificat — non automatisé dans cette phase (le
conteneur `certbot` ne peut pas exécuter `nginx -s reload` sur le conteneur voisin) : à surveiller
manuellement ou à automatiser via un hook `--deploy-hook` certbot dans une itération future si la
fenêtre de ~60-90 jours s'avère insuffisante en pratique.

## WebSocket (Socket.io)

Le bloc `location /` du template nginx (`infrastructure/docker/nginx/templates/default.conf.template`)
passe les en-têtes `Upgrade`/`Connection` nécessaires au handshake Engine.IO du `RealtimeGateway`
(namespace `/realtime`, Phase 6) — aucune configuration séparée n'est nécessaire, HTTP et WebSocket
partagent le même bloc proxy vers `api:3000`.

## Limites connues

- Jamais exécuté contre un vrai domaine/serveur public — seule la syntaxe nginx/certbot a été
  vérifiée contre leur documentation officielle respective.
- Renouvellement non rechargé automatiquement côté nginx (voir ci-dessus).
- Pas de support multi-domaine/multi-établissement avec sous-domaines dédiés (`server_name` unique).
