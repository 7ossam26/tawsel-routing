#!/bin/sh
set -eu
: "${TAWSEL_APP_DB_PASSWORD_FILE:?app DB password file required}"
: "${TAWSEL_IDENTITY_DB_PASSWORD_FILE:?identity DB password file required}"
: "${TAWSEL_MOCK_DB_PASSWORD_FILE:?mock DB password file required}"
TAWSEL_APP_DB_PASSWORD=$(cat "$TAWSEL_APP_DB_PASSWORD_FILE")
TAWSEL_IDENTITY_DB_PASSWORD=$(cat "$TAWSEL_IDENTITY_DB_PASSWORD_FILE")
TAWSEL_MOCK_DB_PASSWORD=$(cat "$TAWSEL_MOCK_DB_PASSWORD_FILE")
: "${TAWSEL_APP_DB_PASSWORD:?app DB password required}"
: "${TAWSEL_IDENTITY_DB_PASSWORD:?identity DB password required}"
: "${TAWSEL_MOCK_DB_PASSWORD:?mock DB password required}"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v app_password="$TAWSEL_APP_DB_PASSWORD" -v identity_password="$TAWSEL_IDENTITY_DB_PASSWORD" -v mock_password="$TAWSEL_MOCK_DB_PASSWORD" <<'SQL'
CREATE ROLE tawsel_app_owner LOGIN PASSWORD :'app_password';
CREATE ROLE tawsel_identity_owner LOGIN PASSWORD :'identity_password';
CREATE ROLE mock_owner LOGIN PASSWORD :'mock_password';
CREATE DATABASE tawsel_app_pilot OWNER tawsel_app_owner;
COMMENT ON DATABASE tawsel_app_pilot IS 'tawsel:application:v1';
CREATE DATABASE tawsel_identity OWNER tawsel_identity_owner;
CREATE DATABASE mock_erp_pilot OWNER mock_owner;
COMMENT ON DATABASE mock_erp_pilot IS 'tawsel:external-mock-erp:v1';
REVOKE ALL ON DATABASE tawsel_app_pilot FROM PUBLIC;
REVOKE ALL ON DATABASE tawsel_identity FROM PUBLIC;
REVOKE ALL ON DATABASE mock_erp_pilot FROM PUBLIC;
SQL
{
  printf 'hostnossl all all 0.0.0.0/0 reject\n'
  printf 'hostnossl all all ::/0 reject\n'
  cat "$PGDATA/pg_hba.conf"
} > "$PGDATA/pg_hba.conf.tawsel"
mv "$PGDATA/pg_hba.conf.tawsel" "$PGDATA/pg_hba.conf"
