#!/bin/sh
# Restore drill automatisé (Phase 31) : récupère la DERNIÈRE sauvegarde déposée hors-site, la
# déchiffre, et la restaure dans des conteneurs PostgreSQL/MongoDB JETABLES ET ISOLÉS — jamais
# contre les bases de dev/prod réelles, même précaution que le test manuel de la Phase 22. Conçu
# pour tourner en CI (.github/workflows/restore-drill.yml, cron hebdomadaire + déclenchement manuel)
# ou en local sur un poste avec Docker. Sort en échec (non-zéro) si la moindre étape échoue ou si la
# vérification d'intégrité post-restauration ne trouve aucune donnée — pour que l'automatisation qui
# l'appelle puisse alerter sans intervention humaine.
#
# Contrairement au test ponctuel de la Phase 22 (qui restaurait un dump LOCAL), ce script télécharge
# réellement la copie hors-site avant de la restaurer — il prouve donc que la sauvegarde est
# récupérable même si l'hôte de production et son volume Docker local disparaissent entièrement.
#
# Prérequis : exécuté depuis la racine du repo (utilise infrastructure/docker/postgres-init-prod
# pour répliquer la précondition "rôle applicatif déjà créé" du restore réel, voir Phase 22). Docker
# doit être disponible. rclone doit être installé et configuré (RCLONE_CONFIG_OFFSITE_*).
set -eu

: "${OFFSITE_BACKUP_BUCKET:?OFFSITE_BACKUP_BUCKET manquant}"
: "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE manquant}"

racine_repo=$(cd "$(dirname "$0")/../../.." && pwd)
init_role_dir="$racine_repo/infrastructure/docker/postgres-init-prod"
[ -d "$init_role_dir" ] || { echo "Introuvable : $init_role_dir (le script doit voir le repo complet)" >&2; exit 1; }

# shellcheck source=lib-crypto.sh
. "$(dirname "$0")/lib-crypto.sh"
# shellcheck source=lib-offsite.sh
. "$(dirname "$0")/lib-offsite.sh"

suffixe=$$
reseau="sih-saas-drill-net-$suffixe"
pg_container="sih-saas-drill-pg-$suffixe"
mongo_container="sih-saas-drill-mongo-$suffixe"
drill_pg_password="drill-$(date -u +%s)-pg"
drill_mongo_password="drill-$(date -u +%s)-mongo"
travail=$(mktemp -d)

nettoyer() {
  echo "Nettoyage des ressources jetables..."
  docker rm -f "$pg_container" "$mongo_container" >/dev/null 2>&1 || true
  docker network rm "$reseau" >/dev/null 2>&1 || true
  rm -rf "$travail"
}
trap nettoyer EXIT

echo "1/6 Récupération de la dernière sauvegarde hors-site (bucket: $OFFSITE_BACKUP_BUCKET)..."
horodatage=$(offsite_dernier_horodatage)
[ -n "$horodatage" ] || { echo "ÉCHEC : aucune sauvegarde trouvée hors-site." >&2; exit 1; }
echo "Sauvegarde testée : $horodatage"

offsite_recuperer "${horodatage}/postgres.dump.gpg" "$travail/postgres.dump.gpg"
offsite_recuperer "${horodatage}/mongodb.archive.gpg" "$travail/mongodb.archive.gpg"

echo "2/6 Déchiffrement..."
dechiffrer_fichier "$travail/postgres.dump.gpg" "$travail/postgres.dump"
dechiffrer_fichier "$travail/mongodb.archive.gpg" "$travail/mongodb.archive"

echo "3/6 Démarrage de conteneurs PostgreSQL/MongoDB jetables et isolés..."
docker network create "$reseau" >/dev/null

# POSTGRES_USER=sih_saas (pas le défaut "postgres" de l'image officielle) est OBLIGATOIRE : vérifié
# réellement que le dump contient des `ALTER DEFAULT PRIVILEGES FOR ROLE sih_saas ...` (le rôle
# bootstrap qui possédait les schémas au moment du dump, voir docker-compose.dev.yml/.env.production)
# — si le rôle bootstrap du conteneur jetable porte un autre nom, pg_restore échoue avec "role
# sih_saas does not exist" sur ces lignes, même avec le rôle applicatif sih_saas_app déjà créé.
docker run -d --name "$pg_container" --network "$reseau" \
  -e POSTGRES_USER=sih_saas -e POSTGRES_PASSWORD="$drill_pg_password" -e POSTGRES_DB=sih_saas \
  -e SIH_SAAS_APP_PASSWORD="drill-app-$(date -u +%s)" \
  -v "$init_role_dir:/docker-entrypoint-initdb.d:ro" \
  postgres:16-alpine >/dev/null

docker run -d --name "$mongo_container" --network "$reseau" \
  -e MONGO_INITDB_ROOT_USERNAME=sih_saas -e MONGO_INITDB_ROOT_PASSWORD="$drill_mongo_password" \
  mongo:7 >/dev/null

echo "4/6 Attente de la disponibilité des bases jetables..."
pg_pret=false
for _ in $(seq 1 30); do
  if docker exec -e PGPASSWORD="$drill_pg_password" "$pg_container" pg_isready -U sih_saas >/dev/null 2>&1; then
    pg_pret=true
    break
  fi
  sleep 2
done
[ "$pg_pret" = true ] || { echo "ÉCHEC : Postgres jetable jamais devenu disponible." >&2; exit 1; }

mongo_pret=false
for _ in $(seq 1 30); do
  if docker exec "$mongo_container" mongosh --quiet --eval "db.runCommand({ping:1})" >/dev/null 2>&1; then
    mongo_pret=true
    break
  fi
  sleep 2
done
[ "$mongo_pret" = true ] || { echo "ÉCHEC : MongoDB jetable jamais devenu disponible." >&2; exit 1; }

echo "5/6 Restauration dans les conteneurs jetables..."
docker cp "$travail/postgres.dump" "$pg_container:/tmp/postgres.dump"
docker exec -e PGPASSWORD="$drill_pg_password" "$pg_container" \
  pg_restore -U sih_saas -d sih_saas --clean --if-exists --no-owner /tmp/postgres.dump

docker cp "$travail/mongodb.archive" "$mongo_container:/tmp/mongodb.archive"
docker exec "$mongo_container" \
  mongorestore --username sih_saas --password "$drill_mongo_password" --authenticationDatabase admin \
  --archive=/tmp/mongodb.archive --gzip --drop

echo "6/6 Vérification d'intégrité..."
nb_tables=$(docker exec -e PGPASSWORD="$drill_pg_password" "$pg_container" \
  psql -U sih_saas -d sih_saas -tAc \
  "select count(*) from information_schema.tables where table_schema in ('public','clinic','platform')" | tr -d '[:space:]')
echo "Tables PostgreSQL restaurées : $nb_tables"
[ "${nb_tables:-0}" -gt 0 ] || { echo "ÉCHEC : 0 table restaurée." >&2; exit 1; }

nb_collections=$(docker exec "$mongo_container" mongosh --quiet \
  --username sih_saas --password "$drill_mongo_password" --authenticationDatabase admin \
  --eval "print(db.getSiblingDB('sih_saas').getCollectionNames().length)" | tail -n1 | tr -d '[:space:]')
echo "Collections MongoDB restaurées : $nb_collections"
[ "${nb_collections:-0}" -gt 0 ] || { echo "ÉCHEC : 0 collection MongoDB restaurée." >&2; exit 1; }

echo "RESTORE DRILL RÉUSSI — sauvegarde hors-site $horodatage restaurée et vérifiée intégralement."
