#!/bin/sh
set -eu
: "${NOMINATIM_PASSWORD_FILE:?Nominatim password file required}"
NOMINATIM_PASSWORD=$(cat "$NOMINATIM_PASSWORD_FILE")
: "${NOMINATIM_PASSWORD:?Nominatim password required}"
export NOMINATIM_PASSWORD
exec /app/start.sh "$@"
