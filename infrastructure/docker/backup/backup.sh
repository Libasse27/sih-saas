#!/bin/sh
# Sauvegarde PostgreSQL (pg_dump, format custom -Fc — restaurable avec pg_restore, compressé) et
# MongoDB (mongodump --archive --gzip) dans un dossier horodaté, puis purge les sauvegardes plus
# anciennes que BACKUP_RETENTION_DAYS. Conçu pour tourner dans le conteneur infrastructure/docker/backup
# (cron interne, voir crontab) — chaque sauvegarde est un dossier autonome restaurable via restore.sh.
set -eu

: "${BACKUP_DIR:=/backups}"
: "${BACKUP_RETENTION_DAYS:=30}"
: "${POSTGRES_HOST:=postgres}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_USER:?POSTGRES_USER manquant}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD manquant}"
: "${POSTGRES_DB:?POSTGRES_DB manquant}"
: "${MONGODB_URI:?MONGODB_URI manquant}"

horodatage=$(date -u +%Y%m%dT%H%M%SZ)
dossier="$BACKUP_DIR/$horodatage"
mkdir -p "$dossier"

echo "[$horodatage] Sauvegarde PostgreSQL ($POSTGRES_DB)..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -Fc -f "$dossier/postgres.dump" "$POSTGRES_DB"

echo "[$horodatage] Sauvegarde MongoDB..."
mongodump --uri="$MONGODB_URI" --archive="$dossier/mongodb.archive" --gzip

echo "[$horodatage] Sauvegarde terminée : $dossier"
du -sh "$dossier"/* 2>/dev/null || true

echo "Purge des sauvegardes de plus de ${BACKUP_RETENTION_DAYS} jours..."
find "$BACKUP_DIR" -maxdepth 1 -mindepth 1 -type d -mtime +"$BACKUP_RETENTION_DAYS" -print -exec rm -rf {} +
