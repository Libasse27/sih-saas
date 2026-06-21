# Abstraction d'envoi/récupération hors-site via rclone — agnostique du fournisseur (AWS S3, MinIO,
# Backblaze B2, Wasabi, OVH, Scaleway, DigitalOcean Spaces... tout backend compatible S3, et au-delà
# puisque rclone supporte aussi b2/azureblob/sftp en changeant simplement RCLONE_CONFIG_OFFSITE_TYPE).
# Piloté entièrement par les variables d'environnement RCLONE_CONFIG_OFFSITE_* — convention officielle
# rclone pour définir un remote nommé "offsite" sans fichier de config (voir docs/plan-de-reprise.md).
# Kill-switch : si OFFSITE_BACKUP_ENABLED != "true", offsite_envoyer() ne fait rien (pas d'erreur) —
# même philosophie que Settings.paiements.actifs (Phase 16), pour ne jamais bloquer une sauvegarde
# locale tant qu'aucun fournisseur hors-site n'a été configuré avec de vraies credentials.
# À sourcer (`. lib-offsite.sh`), pas à exécuter directement.
set -eu

: "${OFFSITE_BACKUP_ENABLED:=false}"
: "${OFFSITE_BACKUP_BUCKET:=}"

offsite_actif() {
  [ "$OFFSITE_BACKUP_ENABLED" = "true" ]
}

offsite_envoyer() {
  fichier_local="$1"
  cle_distante="$2"
  if ! offsite_actif; then
    echo "Hors-site désactivé (OFFSITE_BACKUP_ENABLED != true) — envoi ignoré : $cle_distante"
    return 0
  fi
  : "${OFFSITE_BACKUP_BUCKET:?OFFSITE_BACKUP_BUCKET manquant}"
  rclone copyto "$fichier_local" "offsite:${OFFSITE_BACKUP_BUCKET}/${cle_distante}"
}

offsite_recuperer() {
  cle_distante="$1"
  fichier_local="$2"
  : "${OFFSITE_BACKUP_BUCKET:?OFFSITE_BACKUP_BUCKET manquant}"
  rclone copyto "offsite:${OFFSITE_BACKUP_BUCKET}/${cle_distante}" "$fichier_local"
}

# Renvoie le préfixe (horodatage) de la sauvegarde la plus récente déposée hors-site, en se basant
# sur le tri lexical des clés "<horodatage>/postgres.dump.gpg" — valide puisque l'horodatage est au
# format UTC YYYYMMDDTHHMMSSZ (tri lexical = tri chronologique, même convention que backup.sh).
#
# --files-only est OBLIGATOIRE : vérifié réellement que sans lui, `rclone lsf -R` liste aussi
# l'entrée de RÉPERTOIRE elle-même ("<horodatage>/", sans nom de fichier) en plus des fichiers qui
# matchent --include — cette entrée passe le filtre car rclone l'émet pendant la marche récursive,
# pas parce qu'elle correspond au motif. Sans --files-only, le tri lexical pouvait classer cette
# entrée "<horodatage>/" après le vrai "<horodatage>/postgres.dump.gpg" (le caractère '/' du nom de
# fichier la rend lexicalement plus grande), et le sed ne retirait alors rien (pas de suffixe
# "/postgres.dump.gpg" sur cette ligne) : le horodatage final renvoyé gardait un "/" final erroné.
offsite_dernier_horodatage() {
  : "${OFFSITE_BACKUP_BUCKET:?OFFSITE_BACKUP_BUCKET manquant}"
  rclone lsf -R --files-only --include "*/postgres.dump.gpg" "offsite:${OFFSITE_BACKUP_BUCKET}" 2>/dev/null \
    | sed 's#/postgres\.dump\.gpg$##' \
    | sort \
    | tail -n1
}
