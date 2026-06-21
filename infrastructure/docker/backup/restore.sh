#!/bin/sh
# Restaure une sauvegarde produite par backup.sh. ATTENTION : --clean (Postgres) et --drop (Mongo)
# suppriment les objets existants avant restauration — destiné à une restauration complète
# (reprise après incident), pas à une fusion partielle de données.
#
# Depuis la Phase 31 : les archives sont stockées chiffrées (.gpg, lib-crypto.sh) — déchiffrées dans
# un dossier temporaire (supprimé en sortie via trap, jamais laissé en clair sur le disque) avant
# pg_restore/mongorestore.
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

. /usr/local/bin/lib-crypto.sh

horodatage="${1:?Usage: restore.sh <horodatage>}"
dossier="$BACKUP_DIR/$horodatage"
[ -d "$dossier" ] || { echo "Sauvegarde introuvable : $dossier" >&2; exit 1; }

dossier_tmp=$(mktemp -d)
trap 'rm -rf "$dossier_tmp"' EXIT

echo "Déchiffrement de $dossier..."
dechiffrer_fichier "$dossier/postgres.dump.gpg" "$dossier_tmp/postgres.dump"
dechiffrer_fichier "$dossier/mongodb.archive.gpg" "$dossier_tmp/mongodb.archive"

echo "Restauration PostgreSQL depuis $dossier/postgres.dump.gpg..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner "$dossier_tmp/postgres.dump"

echo "Restauration MongoDB depuis $dossier/mongodb.archive.gpg..."
mongorestore --uri="$MONGODB_URI" --archive="$dossier_tmp/mongodb.archive" --gzip --drop

echo "Restauration terminée."
