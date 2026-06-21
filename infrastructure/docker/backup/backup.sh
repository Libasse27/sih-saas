#!/bin/sh
# Sauvegarde PostgreSQL (pg_dump, format custom -Fc — restaurable avec pg_restore, compressé) et
# MongoDB (mongodump --archive --gzip) dans un dossier horodaté, puis purge les sauvegardes plus
# anciennes que BACKUP_RETENTION_DAYS. Conçu pour tourner dans le conteneur infrastructure/docker/backup
# (cron interne, voir crontab) — chaque sauvegarde est un dossier autonome restaurable via restore.sh.
#
# Depuis la Phase 31 : chaque archive est chiffrée (AES256, lib-crypto.sh) immédiatement après le
# dump et le clair est supprimé — le dossier local ne contient plus jamais que des .gpg (chiffrement
# at-rest réel, pas seulement celui du disque hôte). Si OFFSITE_BACKUP_ENABLED=true, les .gpg sont
# aussi envoyés hors-site (lib-offsite.sh) ; sinon cette étape est ignorée sans erreur.
set -eu

: "${BACKUP_DIR:=/backups}"
: "${BACKUP_RETENTION_DAYS:=30}"
: "${POSTGRES_HOST:=postgres}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_USER:?POSTGRES_USER manquant}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD manquant}"
: "${POSTGRES_DB:?POSTGRES_DB manquant}"
: "${MONGODB_URI:?MONGODB_URI manquant}"

. /usr/local/bin/lib-crypto.sh
. /usr/local/bin/lib-offsite.sh

horodatage=$(date -u +%Y%m%dT%H%M%SZ)
dossier="$BACKUP_DIR/$horodatage"
mkdir -p "$dossier"

echo "[$horodatage] Sauvegarde PostgreSQL ($POSTGRES_DB)..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -Fc -f "$dossier/postgres.dump" "$POSTGRES_DB"

echo "[$horodatage] Sauvegarde MongoDB..."
mongodump --uri="$MONGODB_URI" --archive="$dossier/mongodb.archive" --gzip

echo "[$horodatage] Chiffrement des archives (AES256, at-rest)..."
chiffrer_fichier "$dossier/postgres.dump" "$dossier/postgres.dump.gpg"
chiffrer_fichier "$dossier/mongodb.archive" "$dossier/mongodb.archive.gpg"
rm -f "$dossier/postgres.dump" "$dossier/mongodb.archive"

if offsite_actif; then
  echo "[$horodatage] Envoi hors-site..."
  offsite_envoyer "$dossier/postgres.dump.gpg" "$horodatage/postgres.dump.gpg"
  offsite_envoyer "$dossier/mongodb.archive.gpg" "$horodatage/mongodb.archive.gpg"
else
  echo "[$horodatage] Hors-site désactivé (OFFSITE_BACKUP_ENABLED != true) — sauvegarde locale uniquement."
fi

echo "[$horodatage] Sauvegarde terminée : $dossier"
du -sh "$dossier"/* 2>/dev/null || true

echo "Purge des sauvegardes locales de plus de ${BACKUP_RETENTION_DAYS} jours..."
find "$BACKUP_DIR" -maxdepth 1 -mindepth 1 -type d -mtime +"$BACKUP_RETENTION_DAYS" -print -exec rm -rf {} +
echo "Note : la purge ci-dessus ne touche que le volume local — la rétention des copies hors-site relève du cycle de vie configuré côté fournisseur (ex. règle de lifecycle S3), pas de ce script."
