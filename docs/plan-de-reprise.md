# Observabilité, sauvegardes et plan de reprise

**Phase 22 (terme utilisateur, absent du prompt maître) — 2026-06-20.**
**Mis à jour en Phase 31 (2026-06-21) — chiffrement at-rest, sauvegarde hors-site, restore drill automatisé.**

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
`mongodb-tools` (Database Tools officiels modernes, malgré le nom legacy du paquet),
`postgresql16-client`, `gnupg` et `rclone`, exécutant `backup.sh` chaque jour à 03:00 UTC via
`crond`.

- **PostgreSQL** : `pg_dump -Fc` (format custom, compressé, restaurable sélectivement).
- **MongoDB** : `mongodump --archive --gzip`.
- **Chiffrement at-rest (Phase 31, `lib-crypto.sh`)** : chaque archive est chiffrée en AES256 (GPG
  symétrique) immédiatement après le dump, et le fichier en clair est supprimé — le dossier local ne
  contient plus jamais que des `.gpg`. Passphrase : `BACKUP_ENCRYPTION_PASSPHRASE`
  (`.env.production`), **obligatoire**, à générer indépendamment (`openssl rand -base64 32`) et à
  conserver hors de ce repo et hors du stockage des sauvegardes elles-mêmes — sa perte rend toutes
  les sauvegardes irrécupérables, y compris pour l'opérateur de la plateforme.
- Chaque exécution crée un dossier horodaté (`/backups/<horodatage>/`) dans le volume nommé
  `sih_saas_backups_data`. Purge automatique des dossiers **locaux** plus anciens que
  `BACKUP_RETENTION_DAYS` (30 jours par défaut, configurable dans `.env.production`).
- **Aucune nouvelle credential DB à gérer** : le service réutilise les identifiants bootstrap/root
  déjà définis (`POSTGRES_BOOTSTRAP_USER/PASSWORD`, `MONGO_ROOT_USER/PASSWORD`) pour garantir une
  sauvegarde complète indépendamment des droits du rôle applicatif `sih_saas_app`.

### Sauvegarde hors-site (Phase 31, `lib-offsite.sh`)

Envoi des archives chiffrées vers un stockage objet externe via **rclone**, agnostique du
fournisseur (AWS S3, MinIO, Backblaze B2, Wasabi, OVH, Scaleway, DigitalOcean Spaces — tout backend
compatible S3 ; au-delà avec `RCLONE_CONFIG_OFFSITE_TYPE` sur b2/azureblob/sftp/etc.).

- **Désactivé par défaut** (`OFFSITE_BACKUP_ENABLED=false`, kill-switch — même philosophie que
  `Settings.paiements.actifs`, Phase 16) tant qu'aucun fournisseur n'a été configuré avec de vraies
  credentials. `backup.sh` continue de fonctionner normalement (sauvegarde locale chiffrée
  uniquement) si désactivé — aucune erreur.
- Configuration entièrement par variables d'environnement (`RCLONE_CONFIG_OFFSITE_*`, convention
  officielle rclone pour définir un remote nommé "offsite" sans fichier de config) +
  `OFFSITE_BACKUP_BUCKET` — voir `.env.production.example` pour la liste complète et des exemples.
- **La rétention des copies hors-site n'est pas gérée par ce projet** : `backup.sh` ne purge que le
  volume local. Configurer une règle de cycle de vie (lifecycle) côté fournisseur de stockage objet
  pour purger automatiquement les copies hors-site obsolètes.

### Restore drill automatisé (Phase 31, `restore-drill.sh` + `.github/workflows/restore-drill.yml`)

Comble la lacune "pas de restauration planifiée de test" identifiée en Phase 22. Chaque semaine
(cron GitHub Actions, lundi 04:00 UTC, + déclenchement manuel `workflow_dispatch`) :

1. Récupère la **dernière sauvegarde réellement présente hors-site** (pas une copie locale) —
   preuve que la copie distante est récupérable même si l'hôte de production et son volume Docker
   disparaissent entièrement.
2. La déchiffre.
3. La restaure dans des conteneurs PostgreSQL/MongoDB **jetables et isolés**, créés et détruits pour
   ce seul test (jamais contre une base réelle — même précaution que le test manuel de la Phase 22,
   désormais automatisée et récurrente).
4. Vérifie l'intégrité (présence d'au moins une table Postgres et une collection MongoDB) et échoue
   bruyamment (sortie non-zéro, alerte GitHub Actions) si la restauration ou la vérification échoue.
5. Si aucune credential hors-site n'est configurée (secrets GitHub absents), le job se termine avec
   un simple avertissement plutôt qu'un échec — pour ne pas spammer d'alertes tant que le hors-site
   n'a pas été activé en pratique.

### Procédure de restauration manuelle

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

### Vérification effectuée

**Phase 22** — cycle complet testé réellement, pas seulement relu :
1. `backup.sh` exécuté contre les conteneurs de développement réels (Postgres 16 + MongoDB 7) — dump
   produit avec succès (schéma `clinic`/`platform`/`public`, 44 tables ; collections MongoDB).
2. `restore.sh` exécuté contre une **paire de conteneurs Postgres/MongoDB jetables et isolés**
   (jamais contre la base de développement réelle, pour ne rien écraser sans autorisation) —
   restauration intégrale confirmée : 3 schémas, 44 tables côté Postgres, documents + index
   restaurés côté MongoDB sans échec.
3. Conteneurs/réseau/volumes de test détruits après vérification.

**Phase 31** — cycle complet testé réellement contre Docker (pas seulement relu), avec un conteneur
MinIO local en doublure du hors-site :
1. Image buildée (`gnupg` + `rclone` confirmés fonctionnels), `backup.sh` exécuté contre les
   conteneurs de développement réels — dump, chiffrement AES256, suppression du clair local, envoi
   hors-site vers MinIO tous confirmés.
2. Copie hors-site retéléchargée et vérifiée comme un VRAI chiffrement OpenPGP (en-tête binaire +
   `gpg --list-packets`), pas un no-op.
3. Restauration complète (logique identique à `restore-drill.sh`) depuis la copie hors-site
   déchiffrée, dans des conteneurs PostgreSQL/MongoDB jetables : **44 tables PostgreSQL + 1
   collection MongoDB restaurées avec succès**.
4. **4 bugs réels trouvés et corrigés pendant cette vérification** (aucun n'aurait été détecté par
   une simple relecture) : cache `gpg-agent` masquant un déchiffrement avec mauvaise passphrase
   (`--no-symkey-cache`), code de sortie de fonction shell écrasé par la commande de nettoyage,
   entrée de répertoire parasite dans `rclone lsf -R` faussant la résolution du dernier horodatage
   (`--files-only`), rôle bootstrap Postgres codé en dur (`postgres`) au lieu du rôle réel du projet
   (`sih_saas`) faisant échouer le replay des `ALTER DEFAULT PRIVILEGES`.

### Limites connues (honnêtes, après la Phase 31)

- **Aucune vraie credential de stockage objet fournie à ce jour** — le pipeline hors-site
  (`lib-offsite.sh`, `restore-drill.sh`, workflow CI) est structurellement complet et vérifié contre
  un stockage S3-compatible de test, mais reste désactivé en pratique (`OFFSITE_BACKUP_ENABLED=false`)
  jusqu'à ce qu'un fournisseur réel (AWS S3, Backblaze B2, OVH, etc.) soit choisi et ses credentials
  renseignées dans `.env.production` (déploiement) et dans les secrets GitHub du repo (restore drill
  CI : `OFFSITE_BACKUP_BUCKET`, `BACKUP_ENCRYPTION_PASSPHRASE`, `RCLONE_CONFIG_OFFSITE_*`).
- **Aucun run réel du workflow `restore-drill.yml` sur GitHub Actions** — comme pour la CI Cypress
  (Phase 26), la vérification s'est faite en reproduisant les étapes localement, jamais via un vrai
  déclenchement Actions (nécessiterait un push + des secrets configurés). À surveiller au premier run
  réel.
- **Pas de failover multi-région** — un seul serveur, une seule zone ; en cas de panne
  d'infrastructure complète, la reprise applicative (au-delà de la restauration des données) reste
  manuelle (relancer `docker compose up` sur un nouvel hôte).
- **La passphrase de chiffrement (`BACKUP_ENCRYPTION_PASSPHRASE`) est un secret unique** : sa perte
  rend toutes les sauvegardes (locales et hors-site) irrécupérables. Aucune rotation ni séquestre
  multi-personnes (ex. Shamir's Secret Sharing) n'est implémenté — à évaluer si une exigence de
  conformité formelle l'impose un jour.

## 4. Objectifs RTO/RPO (estimation, à valider avec l'hébergeur réel retenu)

| Indicateur | Valeur estimée | Détail |
|---|---|---|
| RPO (perte de données max.) | ~24h | Fréquence de sauvegarde actuelle (quotidienne, 03:00 UTC) |
| RTO (temps de reprise max.) | quelques heures | Manuel : provisionner un hôte, `docker compose up`, `restore.sh` ; aucune procédure chronométrée à ce jour |

Pour réduire le RPO sous 24h (ex. quelques heures), augmenter la fréquence du cron dans
`infrastructure/docker/backup/crontab` — compromis direct avec la charge I/O sur les bases en
production et l'espace de stockage consommé.
