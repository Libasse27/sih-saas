# Image dédiée aux sauvegardes Postgres + MongoDB de la plateforme. Alpine fournit `mongodb-tools`
# (paquet 100.x — Database Tools officiels modernes, malgré le nom legacy) et `postgresqlNN-client`
# en versions exactement alignées avec les images serveur utilisées ailleurs dans ce projet
# (postgres:16-alpine, mongo:7) — voir vérification dans la description de la Phase 22.
#
# Depuis la Phase 31 : `gnupg` (chiffrement at-rest AES256, lib-crypto.sh) et `rclone` (envoi/
# récupération hors-site agnostique du fournisseur, lib-offsite.sh) — `rclone` n'est pas packagé
# pour Alpine 3.20 dans le dépôt communautaire à une version garantie récente, installé via le
# script officiel (binaire statique Go, aucune dépendance) plutôt que via apk.
FROM alpine:3.20

RUN apk add --no-cache mongodb-tools postgresql16-client bash gnupg curl unzip \
  && curl -fsSL https://rclone.org/install.sh | bash \
  && apk del curl unzip

COPY backup.sh restore.sh entrypoint.sh lib-crypto.sh lib-offsite.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh /usr/local/bin/entrypoint.sh \
  /usr/local/bin/lib-crypto.sh /usr/local/bin/lib-offsite.sh

COPY crontab /etc/crontabs/root

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
