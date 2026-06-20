# Image dédiée aux sauvegardes Postgres + MongoDB de la plateforme. Alpine fournit `mongodb-tools`
# (paquet 100.x — Database Tools officiels modernes, malgré le nom legacy) et `postgresqlNN-client`
# en versions exactement alignées avec les images serveur utilisées ailleurs dans ce projet
# (postgres:16-alpine, mongo:7) — voir vérification dans la description de la Phase 22.
FROM alpine:3.20

RUN apk add --no-cache mongodb-tools postgresql16-client bash

COPY backup.sh restore.sh entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh /usr/local/bin/entrypoint.sh

COPY crontab /etc/crontabs/root

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
