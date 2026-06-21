#!/bin/sh
# busybox crond ne transmet pas l'environnement du conteneur aux tâches planifiées (contrairement
# à un `docker run`/`docker compose exec` direct) — on le capture une fois ici dans un fichier que
# le job cron source explicitement (voir crontab). Limitation acceptée : les valeurs contenant des
# métacaractères shell ($, `, ', ") seraient mal interprétées lors du `source` — générer les mots de
# passe POSTGRES_PASSWORD/MONGO_PASSWORD avec un alphabet alphanumérique simple.
#
# Phase 31 : OFFSITE_ (kill-switch + bucket) et RCLONE_CONFIG_ (credentials du remote hors-site,
# convention officielle rclone) ajoutés à la capture — sans ça, le cron quotidien ne verrait jamais
# ces variables et l'envoi hors-site échouerait silencieusement (BACKUP_ENCRYPTION_PASSPHRASE était
# déjà couvert par le préfixe BACKUP_ existant).
set -eu
env | grep -E '^(POSTGRES_|MONGODB_URI|BACKUP_|OFFSITE_|RCLONE_CONFIG_)' > /etc/backup.env
exec crond -f -l 2
