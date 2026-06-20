#!/bin/sh
# busybox crond ne transmet pas l'environnement du conteneur aux tâches planifiées (contrairement
# à un `docker run`/`docker compose exec` direct) — on le capture une fois ici dans un fichier que
# le job cron source explicitement (voir crontab). Limitation acceptée : les valeurs contenant des
# métacaractères shell ($, `, ', ") seraient mal interprétées lors du `source` — générer les mots de
# passe POSTGRES_PASSWORD/MONGO_PASSWORD avec un alphabet alphanumérique simple.
set -eu
env | grep -E '^(POSTGRES_|MONGODB_URI|BACKUP_)' > /etc/backup.env
exec crond -f -l 2
