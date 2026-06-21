# Chiffrement symétrique GPG (AES256) des archives de sauvegarde — appliqué systématiquement,
# que le hors-site (lib-offsite.sh) soit activé ou non, pour combler le gap "pas de chiffrement
# at-rest dédié" identifié en Phase 22 (docs/plan-de-reprise.md). La passphrase ne passe jamais en
# argument de ligne de commande (visible dans `ps`) : elle est écrite dans un fichier temporaire à
# permissions restreintes, supprimé immédiatement après usage. À sourcer (`. lib-crypto.sh`), pas à
# exécuter directement.
#
# --no-symkey-cache est OBLIGATOIRE : vérifié réellement qu'en son absence, gpg-agent met en cache
# la clé de session symétrique entre deux appels gpg — un déchiffrement avec une passphrase erronée
# peut alors "réussir" silencieusement en réutilisant la clé mise en cache lors d'un appel précédent
# avec la bonne passphrase, au lieu d'échouer. Critique pour un script de sauvegarde : sans ce flag,
# une rotation de BACKUP_ENCRYPTION_PASSPHRASE pourrait être masquée par le cache au lieu d'échouer
# proprement sur les archives chiffrées avec l'ancienne valeur.
#
# `return "$code"` explicite après le `rm -f` est OBLIGATOIRE (pas juste pour la forme) : vérifié
# réellement qu'en son absence, le code de sortie de la fonction est celui de `rm -f` (toujours 0,
# dernière commande du corps), pas celui de `gpg` — un échec gpg (mauvaise passphrase, archive
# corrompue) serait alors silencieusement avalé, surtout depuis qu'un appel `if dechiffrer_fichier
# ...; then` désactive `set -e` pour toute la durée de cet appel (règle POSIX sur les conditions de
# if/while), donc rien d'autre ne s'arrête non plus.
set -eu

: "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE manquant}"

chiffrer_fichier() {
  entree="$1"
  sortie="$2"
  fichier_passphrase=$(mktemp)
  chmod 600 "$fichier_passphrase"
  printf '%s' "$BACKUP_ENCRYPTION_PASSPHRASE" > "$fichier_passphrase"
  gpg --batch --yes --pinentry-mode loopback --no-symkey-cache --passphrase-file "$fichier_passphrase" \
    --symmetric --cipher-algo AES256 -o "$sortie" "$entree"
  code=$?
  rm -f "$fichier_passphrase"
  return "$code"
}

dechiffrer_fichier() {
  entree="$1"
  sortie="$2"
  fichier_passphrase=$(mktemp)
  chmod 600 "$fichier_passphrase"
  printf '%s' "$BACKUP_ENCRYPTION_PASSPHRASE" > "$fichier_passphrase"
  gpg --batch --yes --pinentry-mode loopback --no-symkey-cache --passphrase-file "$fichier_passphrase" \
    --decrypt -o "$sortie" "$entree"
  code=$?
  rm -f "$fichier_passphrase"
  return "$code"
}
