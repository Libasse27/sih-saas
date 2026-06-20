# Observabilité, sauvegardes et plan de reprise

**Phase 22 (terme utilisateur, absent du prompt maître) — 2026-06-20.**

Ce document couvre trois volets demandés ensemble par l'utilisateur (prompt maître §19) : logs
structurés, healthchecks, et stratégie de sauvegarde/reprise après incident.

---

## 1. Logs structurés

Avant cette phase, l'API utilisait le logger console par défaut de NestJS (texte non structuré), et
surtout : **`GlobalExceptionFilter` — qui intercepte TOUTE exception de l'application — ne
journalisait jamais rien.** Une erreur 500 ne laissait donc aucune trace côté serveur, seulement la
réponse HTTP renvoyée au client.

Changements (voir `apps/api/src/app.module.ts`, `main.ts`, `shared/filters/global-exception.filter.ts`) :

- **`nestjs-pino`** remplace le logger de Nest globalement (`app.useLogger(app.get(Logger))`) — tous
  les `new Logger(X.name)` déjà existants dans ~7 services continuent de fonctionner sans
  modification, mais émettent maintenant du JSON structuré (texte lisible en dev via `pino-pretty`).
- Chaque requête HTTP est journalisée automatiquement (méthode, URL, code, durée, identifiant de
  corrélation `x-request-id`) — **sans jamais journaliser le corps des requêtes/réponses** (DME,
  prescriptions, etc. ne transitent jamais par les logs). Seuls les en-têtes `Authorization` et
  `Cookie` sont explicitement redactés s'ils venaient à être inclus.
- `GlobalExceptionFilter` journalise maintenant chaque exception : niveau `error` (avec stack trace)
  pour les 5xx, niveau `warn` pour les 4xx. Le format de réponse HTTP au client (`{success, data,
  message, errors?}`) est inchangé.

## 2. Healthcheck (`GET /api/health`)

Deux lacunes corrigées (`apps/api/src/modules/health/health.controller.ts`) :

1. **Redis n'était jamais vérifié**, malgré une dépendance dure en production
   (`docker-compose.prod.yml` : le conteneur `api` ne démarre qu'après `redis: condition:
   service_healthy`). Vérification ajoutée via un ping `ioredis` direct (timeout 2s, pas de retry).
2. **Le endpoint renvoyait toujours HTTP 200**, même si Postgres ou MongoDB étaient down — le corps
   JSON décrivait l'état réel, mais le code HTTP ne le reflétait jamais. Or le healthcheck Docker en
   production (`docker-compose.prod.yml`) ne regarde que le code HTTP
   (`r.statusCode===200`) : **il était donc purement décoratif**, incapable de déclencher un
   redémarrage même en cas de panne totale de base de données. Renvoie maintenant **503** (avec le
   détail des dépendances en panne dans le message) si une dépendance est down.

Découverte annexe : Redis est provisionné partout (dev, prod, config) depuis la Phase 3 d'après les
commentaires du code, mais n'était utilisé par aucune ligne de code applicatif avant cette phase (le
mot de passe `REDIS_PASSWORD` n'était même pas lu par `configuration.ts`, corrigé au passage). Le
ping de santé est la première connexion Redis réelle de l'application — **Redis reste inutilisé pour
du cache/sessions/rate-limiting**, ce qui sortirait du périmètre de cette phase (sujet
Data/Performance, pas Observabilité).

## 3. Sauvegardes — `infrastructure/docker/backup/`

Service Docker dédié (`backup`, ajouté à `docker-compose.prod.yml`) : image Alpine avec
`mongodb-tools` (Database Tools officiels modernes, malgré le nom legacy du paquet) et
`postgresql16-client`, exécutant `backup.sh` chaque jour à 03:00 UTC via `crond`.

- **PostgreSQL** : `pg_dump -Fc` (format custom, compressé, restaurable sélectivement).
- **MongoDB** : `mongodump --archive --gzip`.
- Chaque exécution crée un dossier horodaté (`/backups/<horodatage>/`) dans le volume nommé
  `sih_saas_backups_data`. Purge automatique des dossiers plus anciens que `BACKUP_RETENTION_DAYS`
  (30 jours par défaut, configurable dans `.env.production`).
- **Aucune nouvelle credential à gérer** : le service réutilise les identifiants bootstrap/root déjà
  définis (`POSTGRES_BOOTSTRAP_USER/PASSWORD`, `MONGO_ROOT_USER/PASSWORD`) pour garantir une
  sauvegarde complète indépendamment des droits du rôle applicatif `sih_saas_app`.

### Procédure de restauration

```sh
# 1. Lister les sauvegardes disponibles
docker compose -f docker-compose.prod.yml exec backup ls /backups

# 2. Restaurer une sauvegarde donnée (DESTRUCTIF — voir avertissement ci-dessous)
docker compose -f docker-compose.prod.yml exec backup /usr/local/bin/restore.sh <horodatage>
```

**Avertissement** : `restore.sh` utilise `pg_restore --clean --if-exists` et `mongorestore --drop` —
il supprime les objets existants avant de restaurer. Conçu pour une reprise complète après incident
(perte de données, corruption), pas pour une fusion partielle. Ne jamais exécuter contre une base de
production contenant des données plus récentes que la sauvegarde sans confirmation explicite.

### Vérification effectuée (Phase 22)

Le cycle complet a été testé réellement, pas seulement relu :
1. `backup.sh` exécuté contre les conteneurs de développement réels (Postgres 16 + MongoDB 7) — dump
   produit avec succès (schéma `clinic`/`platform`/`public`, 44 tables ; collections MongoDB).
2. `restore.sh` exécuté contre une **paire de conteneurs Postgres/MongoDB jetables et isolés**
   (jamais contre la base de développement réelle, pour ne rien écraser sans autorisation) —
   restauration intégrale confirmée : 3 schémas, 44 tables côté Postgres, documents + index
   restaurés côté MongoDB sans échec.
3. Conteneurs/réseau/volumes de test détruits après vérification.

### Limites connues (non couvertes par cette phase)

- **Pas de stockage hors-site** : les sauvegardes restent sur le volume Docker local de l'hôte de
  production. Une panne disque/serveur complète emporterait à la fois les données et leurs
  sauvegardes. Recommandation : copier périodiquement `sih_saas_backups_data` vers un stockage
  objet externe (S3-compatible) — non implémenté, nécessite un choix de fournisseur et des
  credentials que seul l'utilisateur peut fournir.
- **Pas de chiffrement at-rest dédié** des fichiers de sauvegarde au-delà de celui du disque hôte —
  pertinent vu l'obligation évoquée par le prompt maître (§19) de conserver des sauvegardes
  chiffrées sur de longues durées pour des données de santé.
- **Pas de restauration automatisée/planifiée de test** ("restore drill") — la vérification ci-dessus
  est ponctuelle, pas un test récurrent automatisé.
- **Pas de failover multi-région** — un seul serveur, une seule zone ; en cas de panne
  d'infrastructure complète, la reprise est manuelle (relancer `docker compose up` + `restore.sh` sur
  un nouvel hôte).

## 4. Objectifs RTO/RPO (estimation, à valider avec l'hébergeur réel retenu)

| Indicateur | Valeur estimée | Détail |
|---|---|---|
| RPO (perte de données max.) | ~24h | Fréquence de sauvegarde actuelle (quotidienne, 03:00 UTC) |
| RTO (temps de reprise max.) | quelques heures | Manuel : provisionner un hôte, `docker compose up`, `restore.sh` ; aucune procédure chronométrée à ce jour |

Pour réduire le RPO sous 24h (ex. quelques heures), augmenter la fréquence du cron dans
`infrastructure/docker/backup/crontab` — compromis direct avec la charge I/O sur les bases en
production et l'espace de stockage consommé.
