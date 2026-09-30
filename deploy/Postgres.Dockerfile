ARG POSTGRES_IMAGE
FROM ${POSTGRES_IMAGE}
ARG PGBACKREST_VERSION=2.59.1-1.pgdg12+1
RUN set -eux; apt-get update; apt-get install -y --no-install-recommends "pgbackrest=${PGBACKREST_VERSION}"; \
  rm -rf /var/lib/apt/lists/*
COPY --chmod=0755 deploy/postgres-entrypoint.sh /usr/local/bin/tawsel-postgres-entrypoint
COPY --chmod=0755 deploy/postgres-init.sh /docker-entrypoint-initdb.d/10-tawsel-databases.sh
ENTRYPOINT ["tawsel-postgres-entrypoint"]
CMD ["postgres"]
