# Recoverable application release

Phase 39 is prepared locally. [Actual checks, failures and pending target work](verification/deployment.md) are the evidence of execution. There is no authorized target connection yet. Do not infer launch readiness from this procedure or a Compose parse. Phase 40 owns independent backup/restore proof.

## Inventory before touching a target

On the identified authorized host, capture a private dated inventory: hostname/OS, Docker/Compose/Dokploy versions, CPU/RAM/swap, cgroup limits, free disk/inodes, every co-located workload, published ports, networks and volume/bind paths. Read `docker ps`, `docker network ls`, `docker volume ls`, `ss -lnt`, `df -h`, `df -i`, `free -m`, and selected `docker inspect --format` fields (image IDs, mounts, networks, resource limits). Do not dump whole container environments or secret-bearing inspect output into this repository.

Record all three OSRM profiles, VROOM config/profile mapping, Nominatim dataset/import-completion marker, exact image digests, file sizes/dataset checksums, mounts, restart policy and current health. Compare them after application staging. Root `docker-compose.yml` is historical Engine setup with import/preprocessing services and mutable OSRM tags; **never run it as application setup**. Do not recreate, rename, update or migrate those Engine services/volumes during an app release. A missing private Engine network is an explicit target prerequisite, not permission to silently rewire a working stack.

Dokploy may already own port 3000, while the historical VROOM default also uses 3000. The new application Compose publishes **no host ports**, and the API uses container port 3001. Engine origins must use the inventoried private DNS aliases and container ports; do not copy historical host mappings blindly. Old public raw Engine bindings, if found, require a separately reviewed networking change before live rollout. No capacity claim follows from KVM 2's product name.

## Reproducible artifacts and databases

Use the source commit plus `package-lock.json`, `deploy/Dockerfile`, `deploy/Keycloak.Dockerfile`, and registry-observed digest pins in `deploy/base-images.json`. Preserve this build manifest, image digests, architecture and application/issuer config revisions in the release record. App/worker/web build together; the custom issuer compiles the existing verified-email recovery provider against Keycloak 26.7.4 and includes the actual theme, origin replacement and self-hosted Cairo font.

Example **build-host** commands (set shell variables from the committed base manifest and actual HTTPS app origin; these commands do not publish images):

```sh
docker build -f deploy/Dockerfile --target runtime --build-arg NODE_IMAGE="$NODE_IMAGE" --build-arg NGINX_IMAGE="$NGINX_IMAGE" --build-arg APP_ORIGIN="$APP_ORIGIN" -t "$APP_BUILD_TAG" .
docker build -f deploy/Dockerfile --target web --build-arg NODE_IMAGE="$NODE_IMAGE" --build-arg NGINX_IMAGE="$NGINX_IMAGE" --build-arg APP_ORIGIN="$APP_ORIGIN" -t "$WEB_BUILD_TAG" .
docker build -f deploy/Keycloak.Dockerfile --build-arg KEYCLOAK_IMAGE="$KEYCLOAK_IMAGE" --build-arg JDK_IMAGE="$JDK_IMAGE" --build-arg APP_IMAGE="$APP_BUILD_TAG" --build-arg APP_ORIGIN="$APP_ORIGIN" -t "$ISSUER_BUILD_TAG" .
```

After a separately authorized registry publication, resolve **registry digests**, then place `repository@sha256:…` references in `deploy/config.env.example`'s external copy. Never use `latest` or a build tag for the running release. Container builds remain pending on this Windows host without a Docker daemon; registry manifest lookup is not a successful build or vulnerability scan.

Provision a **dedicated PostgreSQL 18** application service/database, separate from the Engine's PostgreSQL. A candidate PostgreSQL 18.4 image pin is recorded; the application Compose deliberately does not start or modify a database server. Choose durable storage/cgroup limits from actual inventory. Use TLS with a certificate whose SAN matches its private database hostname. Mount its CA into app/worker/issuer services; the app rejects non-loopback `sslmode=disable`. Do not change the parser to bypass that rule.

For a fresh application database, a database administrator creates a restricted owner and `tawsel_app_pilot`, revokes PUBLIC connection access, and sets `COMMENT ON DATABASE tawsel_app_pilot IS 'tawsel:application:v1'`. The connected user must own this database, and it must contain no foreign extensions. Use a separate restricted owner/database `tawsel_identity` for Keycloak. Never share Engine, application, identity or mock credentials. Set passwords through an interactive protected facility, not literal shell arguments/history. The mock requires its own `mock_erp_…` database and `tawsel:external-mock-erp:v1` marker, no role memberships, superuser, replication, role/database creation or bypass-RLS privileges. See the existing [receiver setup](erp/consumer-quickstart.md).

The root Engine mounts/data, database service configuration and map datasets are not build inputs. The app image excludes `.local`, environment files, Engine data, design exports and browser output. Map assets are pre-provisioned separately and mounted read-only with `create_host_path: false`; missing paths fail rather than create an empty replacement.

## Secrets, issuer and ingress

Copy the example files under `deploy/` into an operator-controlled directory **outside Git/build context**; fill only observed values. Restrict directory/file access and back it up encrypted separately. Compose file-backed secrets are read-only container files, not an encrypted secret manager: use protected host storage or the platform secret facility. `runtime.env` contains application URL/client/session/worker secrets; `outbox.json` uses the existing exact scoped destination/key format; `ca.pem` contains the database trust root. Environment variables already supplied to a container take precedence over Node's env file.

`issuer.env` uses PostgreSQL TLS with `sslrootcert=/run/secrets/ca.pem`, an exact HTTPS hostname, HTTP only behind the trusted TLS proxy, and actual proxy CIDRs. The issuer's management/health port 9000 is never routed publicly. Keep bootstrap admin credentials temporary and external; remove them after initial setup and restrict administrative access, allowing the provisioning worker's required admin API calls through an inventoried trusted route. Do not expose unrestricted database or raw Engine services.

Prepare **new-realm-only** files with:

```sh
npm run deployment:identity -- /private/identity-input.json /private/new-realm-import
```

The generator requires three distinct random 32-byte hex secrets, exact HTTPS app origin and authenticated STARTTLS SMTP. It creates separate company/personal realms, exact `/api/session/callback` redirect, S256 PKCE, separate provisioning service account, personal phone-only login, verified recovery email and the recovery provider flow. It creates no demo human users. File creation refuses overwrite. Import these only into an identified **empty** issuer using its offline import command while all issuer nodes are stopped; protect the mounted import files and remove the mount after import. Never reimport local demo realms into an existing issuer. Existing realm changes require a reviewed export/config diff and recovery plan. Verify issuer discovery `issuer`, authorization redirect, callback, logout redirect, initial email verification and password-recovery delivery to an actual external mailbox. Generating JSON does not verify SMTP, DNS or delivery.

In Dokploy, select only `deploy/compose.yaml`. Configure the app HTTPS domain to **web:8080** and the issuer HTTPS domain to **issuer:8080** on the inventoried ingress network. Retain application networks when Dokploy generates labels; inspect its final effective Compose before release. No direct domain goes to API, workers, DB, raw Engine or private mock. Check that the selected network is shared with Traefik without attaching every service to ingress. The app domain proxies `/api/` to Fastify, blocks `/internal/`, serves `/maps/` with Nginx byte ranges and serves the PWA shell. Local process checks verify range semantics using fixture bytes; actual PMTiles coverage/size/license/checksum and target TLS remain separate checks.

## Release order and recovery

1. Disable concurrent/manual/automatic releases for this application. Capture the actual old image digests, effective config and database migration checksums. Maintain one operator release lock for the entire sequence (for example `flock` on a protected host lock file, also respected by Dokploy hooks). The PostgreSQL migration advisory transaction lock independently prevents competing database runners from applying SQL twice.
2. Require target-bound inventory, recent protected backup, separate failure-domain storage, and **already verified** restore prerequisites for app DB, issuer DB/config and secrets. Proposed pilot RPO is 15 minutes; the preflight therefore refuses a backup completion older than 15 minutes. The restore report can be at most 30 days old and must still match the actual topology/config. This freshness gate is not proof of RPO/RTO or backup correctness. A clean disposable staging install has no customer data to restore; record it explicitly and never fabricate live backup evidence for it.
3. Fill an external copy of `release-evidence.example.json`, bind it to `sha256sum deploy/compose.yaml`, target identity, old/new digests and the protected restore-report hash. Run `npm run deployment:check -- /private/release-evidence.json`. The tool validates operator attestations and negative controls; independently verify report contents and actual effective configuration. Keep target mutation pending when those prerequisites are absent. Run `docker compose --env-file /private/config.env -f deploy/compose.yaml config --quiet` without printing resolved secret values.
4. Pre-create the uniquely named retained-assets volume with ownership writable by the app image's `node` UID (inspect its actual UID, do not assume it). Stop API and the three workers for this pilot's maintenance release. Keep the previous web/issuer config recorded. Pull immutable app/web images only; do not update issuer/database/Engine versions during an ordinary app release.
5. Run `docker compose --env-file /private/config.env -f deploy/compose.yaml --profile release run --rm --no-deps migrate`. This explicit job is the only application migration entry point. Application/worker startup only checks current checksums. All pending migrations and ledger entries commit atomically. On failure, **do not start the new release**. Check the ledger and target; the failed transaction leaves old schema/evidence intact. Fix an unapplied migration and rerun, or resume the old app whose schema matches. Never edit an applied migration/checksum, reset the database or issue blind down migrations.
6. Run the `assets` job using the same command with `assets` replacing `migrate`. It appends hashed assets and Workbox runtime files to the retained volume, refuses name/content collisions and never deletes. A failed copy is safe to retry; don't switch the web until it succeeds.
7. Start API, planning, outbox and provisioning with the exact new image; check readiness and worker observations, then update web. Compose health confirms local service/database/schema state; a recent worker loop is not proof that every job succeeded. Engine health, delivery lag, external receiver applied status and backup health remain separate operator diagnostics. Verify a stored execution action still works during an Engine outage.
8. Check HTTPS/cert chain, exact OIDC redirects/email, a PMTiles `Range: bytes=0-126` response (206 and correct Content-Range/length), an invalid range (416), old hashed asset access, no-cache `sw.js`/shell, absent public DB/raw Engine/admin/diagnostic exposure, and restart/replay with original action IDs. Compare Engine mounts/ports/dataset identities before/after. Record actual commands, versions, results and failures privately with a redacted summary in deployment evidence.

For this P39 app release the SQL boundary remains **0028**, matching P38, so the previous P38 app is the rollback candidate after verifying its checksums and readers. If startup/readiness fails after a successful migration, stop the new processes and restore previous compatible **image/config digests**; keep the database and retained-assets volume. For future additive migrations, do not assume an older binary accepts a newer ledger: current readiness requires exact migration history. Either ship a compatible rollback binary first or use a tested forward fix. Issuer/database-version rollback is a separate vendor migration/restore operation, never automatic.

PWA compatibility: retain the released `1.0.0/1.0.0` readers, immutable action bytes/IDs/dependencies and Dexie 1→2 additive upgrade. Deploy readers before new writers. Keep old hashed JS/CSS/font/Workbox assets for as long as old clients may remain; there is no automatic pruning/expiry task. The nonhashed update guard must remain backward compatible with existing workers. Failed web releases can return to an older web image while retaining every asset. A browser with newer local storage gets the existing compatible-version guidance. Never clear site data, delete IndexedDB, force activation or unregister service workers as recovery. See [account/update rules](offline-account-updates.md).

## Private labelled mock

`deploy/mock-local.compose.yaml` is optional **Linux private staging only**, a separate project from the application/Engine. It uses host networking solely to preserve the existing native mock's mandatory `127.0.0.1` binding and the isolated loopback test callback. A startup wrapper refuses non-native, non-loopback or dynamic-port config before starting a listener. It must never get a Dokploy/public domain. Supply separate mock config/credentials; native config follows [source setup](erp/source-protocol.md), including its separate OIDC client/redirect/session key and private-test label. The health response identifies `external-mock-erp`; the UI retains its existing mock banner.

Use `mock-migrate` once (`--profile release run --rm --no-deps mock-migrate`), then start mock, projection and source workers. `MOCK_ERP_MANAGED_MIGRATIONS=true` makes server/worker startup verify history/scope instead of silently migrating. The historical standalone development behavior remains available when that flag is absent. The portable Windows/local equivalent is `receiver:package`, an explicit `main.js migrate`, then separately supervised `main.js`, `main.js worker`, and `main.js source-worker` with the managed flag and restricted external configuration.

**Production outbox intentionally rejects private/RFC1918 destinations**, while the native mock intentionally refuses production/non-loopback serving. Do not bypass either boundary to attach this staging mock to the production app stack. Full mock integration runs with the existing isolated loopback Tawsel demos; a future target-host mock needs its own reviewed private access/delivery design. This is a concrete pending dependency, not verified target connectivity. The real shipping ERP remains a separate connector consuming the same public contracts.

## Reproduce local evidence and Phase 40 handoff

Use supported Node 24, the marked local test-control database and a built web bundle:

```text
npm run test:deployment
npm run deployment:check
npm run deployment:smoke
npm run recovery:demo
```

For the HTTP smoke set `TAWSEL_NGINX_BINARY` to a verified local Nginx executable. It creates disposable PostgreSQL/database and temporary web/map files, binds loopback, checks real Nginx/API HTTP responses, writes `.local/phase-39-http.json` and cleans up its own resources. Map bytes are a 16-byte fixture; HTTPS is deliberately unclaimed. Browser recovery additionally requires the real local Keycloak setup. The [evidence](verification/deployment.md) identifies exact commands that ran and any remaining gaps.

Phase 40 may rely on migration failure/retry/serialization proof, retained command/readers/assets, explicit app/mock runners, pinned build inputs and the release prerequisites. It still must establish independent app/identity/secrets backup restore, known business checkpoints, measured RPO/RTO and Engine artifact recovery. Do not run Phase 40 or mutate a live host as an implicit step of this preparation.

Primary implementation references: [Docker Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/), [Keycloak optimized containers/providers](https://www.keycloak.org/server/containers), [Keycloak reverse proxy and private management port](https://www.keycloak.org/server/reverseproxy), [Dokploy Compose domains/networks](https://docs.dokploy.com/docs/core/docker-compose/domains), [Nginx supported downloads](https://nginx.org/en/download.html). These describe configuration mechanics, not test results for this target.
