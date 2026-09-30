#!/bin/sh
set -eu

: "${DATABASE_PROJECT:?Set the exact Dokploy Compose database project name in a protected environment file}"
ids=$(docker ps --quiet \
  --filter "label=com.docker.compose.project=$DATABASE_PROJECT" \
  --filter 'label=com.docker.compose.service=database')
set -- $ids
if [ "$#" -ne 1 ]; then
  echo "Expected one running database container for project $DATABASE_PROJECT; found $#" >&2
  exit 1
fi
docker exec --user postgres \
  --env PGBACKREST_CONFIG=/var/lib/postgresql/pgbackrest.conf \
  "$1" pgbackrest --stanza=tawsel --type=full backup
