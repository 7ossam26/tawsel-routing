# Tawsel application operations

P13 adds migration `0009_planning.sql`, [durable planning APIs/worker and forecast runbook](planning-jobs.md). Deploy the migration before updated API/worker processes; old P10/P11 intents and retained B2C work materialize recoverably. Run `npm run planning:worker` under supervision separately from Fastify. It claims one job, releases its DB transaction for bounded HTTP, then fences lease/input before atomic draft/forecast/intent storage. Abrupt worker death is recovered after a 90-second lease; provider failures persist safe errors/backoff and terminate after three automatic attempts. Blocked missing-origin/no-eligible/capacity jobs remain inspectable. `planning:worker:once` inspects/processes one due item; `planning:demo` uses only a disposable database and controlled provider. No Engine setup/map import is performed. See [actual tests and gaps](phase-13-evidence.md).

P08 adds additive migrations 0004/0005, [source bootstrap/rotation/recovery](provisioning.md) and a separately supervised issuer worker. Follow the [local/public consumer quickstart](erp/consumer-quickstart.md). Run provisioning:worker continuously or provisioning:worker:once for one due item; no Engine setup/import is involved. Keep operator and worker secrets separate from consumer credentials, configure HTTPS outside loopback, and retain failed reconciliation work. Production issuer permissions/supervision/TLS remain deployment verification.

P07 adds the [identity/session runbook](identity.md): isolated Keycloak/Mailpit installation, random ignored secrets, exact localhost origin, seed/demo/browser commands and production limits. The API now requires identity environment configuration. `npm run dev` loads `.env.identity.local`; the issuer and sink run separately. Use `http://localhost:5173` for real login, while retained UI-fixture URLs remain usable. No Engine process/setup changes are required.

This runbook covers the web/API workspace, Phase 04 development fixture and Phase 05 application PostgreSQL kernel. It does not operate the retained Nominatim/OSRM/VROOM Engine. Engine setup remains in the root `README.md` and `setup.ps1`.

## What exists now

| Process | Local address | Responsibility |
| --- | --- | --- |
| Web | `http://127.0.0.1:5173` | Arabic RTL workspace shell; developer fixture under `/__fixtures/driver-review` |
| API | `http://127.0.0.1:3001` | Workspace liveness at `GET /health` only |
| Application PostgreSQL 18 | `127.0.0.1:55432` | Separate local cluster under `.local/postgres-18`; application and disposable test databases |

The API health payload reports `scope=workspace` and `engine=not-checked`. It is not routing readiness and does not imply a delivery, database, identity, worker, ERP, or Engine capability.

The web bundle self-hosts Cairo `400`, `600`, `700`, and `800` through `@fontsource/cairo`; it makes no runtime request to Google Fonts. The source license is retained at `docs/licenses/Cairo-OFL-1.1.txt`. Paragraphs use 400, secondary/status text 600, labels 700, and primary headings 800, with `font-synthesis: none` to prevent faux bold. Locally packaged Lucide icons and Radix Dialog retain their ISC/MIT notices under `docs/licenses/`.

The PostgreSQL command kernel is locally verified; no delivery endpoint, user account or background worker exists yet. Keycloak/OIDC, the mock ERP, MapLibre/PMTiles and routing adapters remain future phases. The database contains only tenant/source keys, command result/audit/evidence and outbox intent. These keys are not a tenant administration or authentication implementation.

## Supported local toolchain

- Node.js `>=24.11.0 <25` (Node 24 LTS); exercised with `v24.19.0`.
- npm `>=11.1.0 <12`; exercised with `11.1.0`.
- PostgreSQL **18.4**, `pg 8.23.0`, `@types/pg 8.23.1`; direct SQL migrations, no ORM.
- Exact JavaScript dependency versions are in `package.json` and `package-lock.json`.
- Repository-scoped `.npmrc` uses legacy peer resolution because the pinned `openapi-typescript 7.13.0` still declares TypeScript 5.x while its checked generator is retained with TypeScript 6.0.2. Do not remove that setting until the generator declares compatible peers and the contract drift suite passes after an upgrade.

This range is the common supported overlap of the pinned Vite 8, Vitest 5, Fastify 5, and lint/type tooling. CI uses Node `24.19.0` and the lockfile via `npm ci`.

## First setup and repeat setup

From the repository root in PowerShell:

```powershell
.\scripts\setup-app.ps1
npm run db:local:start
npm run db:migrate
npm run check
```

The setup script validates Node/npm, creates `.env` only when absent, runs `npm ci`, and optionally (`-Check`) runs all checks once PostgreSQL is ready. It preserves existing `.env`. Database startup is explicit and separate. Neither setup script invokes Engine Compose, map imports or volume commands.

Manual equivalent:

```powershell
Copy-Item .env.example .env  # only when .env does not exist
npm ci
npm run db:local:start   # Windows; PostgreSQL 18 bin must be on PATH
npm run db:migrate
npm run check
```

The example configuration is safe for local use and contains no secret:

```dotenv
TAWSEL_API_HOST=127.0.0.1
TAWSEL_API_PORT=3001
VITE_TAWSEL_API_BASE_URL=http://127.0.0.1:3001
```

All three values remain required. API startup also requires `TAWSEL_DATABASE_URL` and current migrations. No production-secret fallback exists. A test-created `buildApp()` can still exercise workspace HTTP behavior without a database; the actual API entry point always validates its pool and migrations before listening.

## Dedicated PostgreSQL lifecycle

On Windows, install PostgreSQL 18 tools and make `pg_ctl`, `initdb` and `psql` available on PATH. `npm run db:local:start` creates only `.local/postgres-18`, initializes SCRAM credentials with a random local password, binds loopback **55432**, and creates `tawsel_app_dev` plus `tawsel_test_control`. It saves generated connection URLs in ignored `.env.database.local`; preserve that file and `.local/postgres-password`. The password is a development credential, never a production secret. Starting again preserves the existing cluster/credentials. Stop with `npm run db:local:stop`; this retains all data and never stops the installed system PostgreSQL service or the Engine.

API/migration commands read `.env.database.local` and then `.env`; shell environment overrides both. Tests and the demo read `.env.database.local` or explicit `TAWSEL_TEST_ADMIN_URL`, never select the application database. `.env.database.local` is only a local convenience, not a deployment mechanism. Do not check it in.

For other hosts, provision a **separate** PostgreSQL 18.4 server/cluster and a role owning its application database. In psql connected as that role/admin, explicitly mark the intended database:

```sql
CREATE DATABASE tawsel_app_dev OWNER tawsel_app;
COMMENT ON DATABASE tawsel_app_dev IS 'tawsel:application:v1';
```

Set `TAWSEL_DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/tawsel_app_dev?sslmode=verify-full` with correctly URL-encoded credentials. `sslmode=disable` is allowed only on loopback. The current local foundation uses one database-owner role for migration/runtime; production role separation, credential distribution and deploy packaging belong to P39. No Nominatim database, shared Engine credential or map volume is used.

The migration runner accepts application names `tawsel_app_[a-z0-9_]+`, an explicit port, a matching database owner, PostgreSQL 18 and the correct database comment. It rejects URL option overrides, missing/wrong markers, Engine names, non-application extensions and nonempty uninitialized schemas. It uses one transaction/advisory migration lock, contiguous SQL filenames and stored SHA-256 checksums (CRLF normalized to LF). Changed/applied, missing or out-of-order SQL fails closed. Startup only **checks** migrations; it never creates tables implicitly. Run `npm run db:migrate` explicitly. Keep repository `db/migrations/` and `contracts/` alongside compiled `apps/api/dist/`; their paths are runtime inputs.

## Isolated tests and cleanup ownership

`npm run test:database` runs the real `database-lifecycle.test.ts` and `command-transaction.test.ts`. Each suite creates a random `tawsel_test_<32 hex>` database from a **loopback** `tawsel_test_control` connection, checks the control marker and owner, marks its owned database, and applies the same SQL runner. It does not use a transaction wrapped around the test suite. Duplicate races have independent connections, observed `pg_blocking_pids` barriers and real COMMIT boundaries; child Node processes prove termination before/after commit. Test-only counter/progress tables live in the disposable database, never in application migrations.

For an externally prepared local test server, the dedicated test role requires CREATEDB and ownership of `tawsel_test_control`:

```sql
CREATE DATABASE tawsel_test_control OWNER tawsel_test;
COMMENT ON DATABASE tawsel_test_control IS 'tawsel:test-control:v1';
```

Set `TAWSEL_TEST_ADMIN_URL` to that loopback control database with explicit port/credentials. The local helper supplies it automatically. Missing PostgreSQL/configuration fails the suite; there is no skip/mock fallback. Each suite closes its pools and child processes then drops only the random database that invocation created, without FORCE. An abruptly killed whole test runner can leave an isolated database: inspect ownership/marker and active sessions before manually removing that **exact** named database. There is no wildcard cleanup or drop of application/control/Engine databases.

`npm run db:demo` prints real accepted-write counts, same-result retry, fresh-pool recovery, rollback after outbox insertion and pending-only intent, then drops its owned test database. Run the database tests for the stronger concurrent/real-process/retention proofs. The demo is an infrastructure example, not a shipment endpoint.

The [consistency document](tracking-and-consistency.md#implemented-p05-transaction-protocol) specifies lock hierarchy, trusted scopes, hash inputs, hook responsibilities and rejection savepoints. `compactCommandResponses` is an explicit internal maintenance primitive with a fixed 30-day minimum, bounded batches and unresolved-work holds. It is not scheduled. It never deletes identities, audit, evidence or outbox payloads. Future workers must take the command lock before resolving associated intents/holds. Full-response removal returns an explicit compacted receipt/summary; same-ID commands never become fresh. See [retention details](tracking-and-consistency.md#implemented-response-retention).

Pool limits: maximum 10, connection wait 5 seconds, idle lifetime 10 seconds. Business transactions set `synchronous_commit=on`, lock timeout 3 seconds, statement/idle timeout 10 seconds and whole-transaction timeout 15 seconds. On callback failure they roll back; on disconnection the client is discarded. SIGINT/SIGTERM close Fastify and drain the pool. A failed/uncertain COMMIT is not blindly retried; reuse the same command ID after reconnect. These limits are engineering defaults, not production capacity measurements.

## Start, observe, and stop

Start both processes:

```powershell
npm run dev
```

Observe them:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173/
Invoke-RestMethod http://127.0.0.1:3001/health
```

For the labelled fixture review, open `/__fixtures/driver-review`; add `?view=login` or `?view=desktop` for those surfaces. The yellow banner is mandatory evidence that the data are fixed. No click invokes the API or records a business result. Vite production output tree-shakes the fixture module, exposes no fixture navigation and runs a marker scan during `npm run build`.

Expected health response:

```json
{"service":"tawsel-api","status":"ok","scope":"workspace","engine":"not-checked"}
```

Stop both processes with `Ctrl+C` in the terminal that runs `npm run dev`. Do not use `docker compose down` to stop this workspace: that command targets the separate Engine and is unnecessary for web/API development.

## Check commands

| Command | Purpose |
| --- | --- |
| `npm run audit` | Fail on high/critical dependency advisories |
| `npm run test` | Watch both Vitest projects locally |
| `npm run test:fast` | One-shot configuration/unit selection |
| `npm run test:integration` | One-shot real HTTP-boundary selection |
| `npm run test:database` | Real migration/transaction/concurrency/recovery/retention checks |
| `npm run db:demo` | Reproducible isolated command commit/retry/rollback demonstration |
| `npm run test:browser:ui` | Playwright fixture behavior/screenshots at required representative viewports |
| `npm run test:ci` | One-shot complete Vitest run |
| `npm run lint` | ESLint source checks |
| `npm run typecheck` | Strict TypeScript checks across all workspaces |
| `npm run build` | Shared/API compilation and web production bundle |
| `npm run check` | CI order: audit, lint, typecheck, all tests, build |

HTTP integration tests listen on ephemeral loopback ports; database tests require the dedicated PostgreSQL described above. Neither requires the Engine. For a browser port conflict set `$env:TAWSEL_BROWSER_PORT='5185'` before `npm run test:browser:ui`; the test origin follows that port and still rejects external font requests. Browser fixture evidence is separate from database guarantees.

## CI

P06 adds `npm run test:authorization` (real tenant/branch/driver/source isolation), `npm run access:demo` (labelled principals and synthetic records in a disposable DB), and `0002_tenant_access.sql`. `npm run db:migrate` upgrades existing P05 data without inventing metadata/authority for old keys; real provisioning remains P07/P08. Run database and authorization suites before depending on the schema. [Permission contract](authorization.md) documents transaction ordering, revocation and required handler/query/job/export guards. No production header or HTTP endpoint accepts fixture identities.

`.github/workflows/application-checks.yml` runs on application/database/contract changes with read-only repository permissions. It uses Node 24.19.0, `npm ci`, `npm run check` and a dedicated `postgres:18.4` service on 55432. It marks the disposable control database explicitly. No Engine, issuer or map data are started. The workflow is configured/locally reviewed; no remote CI run is claimed by P05.

## Failure guide

| Symptom | Meaning and response |
| --- | --- |
| `Configuration error: TAWSEL_API_HOST is required` | Create/review `.env`; do not add an implicit public bind. |
| `TAWSEL_API_PORT must be an integer...` | Use a free port from 1–65535; local default is 3001. |
| Web build reports `VITE_TAWSEL_API_BASE_URL` | Provide an absolute `http://` or `https://` URL. |
| Port 3001 or 5173 already in use | Stop the earlier app process or deliberately update the local application configuration. Do not move VROOM from 3000 to mask the conflict. |
| `/health` says `engine=not-checked` | Expected in Phase 01; inspect Engine services separately when routing work begins. |
| Docker is unavailable | Native PostgreSQL supports local database tests; CI uses a dedicated service. Engine status remains unknown. |
| Database URL/target or marker refused | Verify the dedicated database name, explicit port, owner and purpose comment; never relabel an Engine database. |
| Migrations missing/checksum mismatch | Run the correct checked-in migration runner on the intended app DB; preserve applied SQL and add a versioned migration. |
| Lock timeout, disconnect, or unknown response | Treat the outcome as unknown until same-ID recovery. Do not choose a new action ID. |

## Preservation boundary

Application setup must not write under `data/`, alter the `nominatim-data` volume, run imports, rebuild OSRM profiles, or edit `docker-compose.yml`, `setup.ps1`, `profiles/motorcycle.lua`, or `vroom-conf/config.yml`. A repeat setup may replace only dependency artifacts managed by `npm ci`; it preserves `.env`, Engine data, Stitch exports, and unrelated files.

## P11 map assets and location demo

Use [locations-and-maps.md](locations-and-maps.md) for explicit archive preparation, checksums, regional coverage, range serving, private Nominatim configuration and isolated demo. Map preparation is never part of install/dev/database setup. npm run test:locations and npm run test:browser:locations are the focused checks. Nginx configuration is a deployable example, not a production deployment claim.

## P12 Engine verification

Use [the Engine boundary guide](engine-boundary.md) for private per-profile origins and bounded calls. `npm run engine:live` reads Docker inventory when available and attempts all three route/table/optimization combinations without starting, pulling or importing. Runtime/data-build pinning remains required before deployment; current live verification is unavailable. `GET /api/v1/routing/profiles` returns supported application enums, not service health.

## P15 round start

`npm run test:rounds`, `npm run rounds:demo` and `npm run test:erp:rounds` reproduce start/action recovery, real PostgreSQL races and portable conformance. [Runbook](round-start.md) and [evidence](phase-15-evidence.md) explain local PostgreSQL PATH setup, session/provider fixtures and future queue/takeover limits. Apply additive migration 0012 with the ordinary app migration runner; Engine setup is unnecessary.
