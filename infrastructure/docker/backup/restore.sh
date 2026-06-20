#!/bin/sh
# Restaure une sauvegarde produite par backup.sh. ATTENTION : --clean (Postgres) et --drop (Mongo)
# suppriment les objets existants avant restauration — destiné à une restauration complète
# (reprise après incident), pas à une fusion partielle de données.
#
# Usage : restore.sh <horodatage>   (ex. restore.sh 20260620T103000Z — voir $BACKUP_DIR pour la liste)
set -eu

: "${BACKUP_DIR:=/backups}"
: "${POSTGRES_HOST:=postgres}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_USER:?POSTGRES_USER manquant}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD manquant}"
: "${POSTGRES_DB:?POSTGRES_DB manquant}"
: "${MONGODB_URI:?MONGODB_URI manquant}"

horodatage="${1:?Usage: restore.sh <horodatage>}"
dossier="$BACKUP_DIR/$horodatage"
[ -d "$dossier" ] || { echo "Sauvegarde introuvable : $dossier" >&2; exit 1; }

echo "Restauration PostgreSQL depuis $dossier/postgres.dump..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner "$dossier/postgres.dump"

echo "Restauration MongoDB depuis $dossier/mongodb.archive..."
mongorestore --uri="$MONGODB_URI" --archive="$dossier/mongodb.archive" --gzip --drop

echo "Restauration terminée."
