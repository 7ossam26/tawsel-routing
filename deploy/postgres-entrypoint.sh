#!/bin/sh
set -eu
if [ "$(id -u)" = 0 ]; then
  mkdir -p /var/lib/postgresql/tls /var/lib/postgresql/pgbackrest-spool
  chown postgres:postgres /var/lib/postgresql/pgbackrest-spool
  install -o postgres -g postgres -m 0600 /run/secrets/server.key /var/lib/postgresql/tls/server.key
  install -o postgres -g postgres -m 0600 /run/secrets/server.crt /var/lib/postgresql/tls/server.crt
  install -o postgres -g postgres -m 0600 /run/secrets/pgbackrest.conf /var/lib/postgresql/pgbackrest.conf
fi
export PGBACKREST_CONFIG=/var/lib/postgresql/pgbackrest.conf
exec docker-entrypoint.sh "$@"
