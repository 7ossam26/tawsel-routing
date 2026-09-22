# Tawsel application operations

This runbook covers the Phase 01 web/API workspace and Phase 04 development-only review fixture. It does not operate the retained Nominatim/OSRM/VROOM Engine. Engine setup remains in the root `README.md` and `setup.ps1`.

## What exists now

| Process | Local address | Responsibility |
| --- | --- | --- |
| Web | `http://127.0.0.1:5173` | Arabic RTL workspace shell; developer fixture under `/__fixtures/driver-review` |
| API | `http://127.0.0.1:3001` | Workspace liveness at `GET /health` only |

The API health payload reports `scope=workspace` and `engine=not-checked`. It is not routing readiness and does not imply a delivery, database, identity, worker, ERP, or Engine capability.

The web bundle self-hosts Cairo `400`, `600`, `700`, and `800` through `@fontsource/cairo`; it makes no runtime request to Google Fonts. The source license is retained at `docs/licenses/Cairo-OFL-1.1.txt`. Paragraphs use 400, secondary/status text 600, labels 700, and primary headings 800, with `font-synthesis: none` to prevent faux bold. Locally packaged Lucide icons and Radix Dialog retain their ISC/MIT notices under `docs/licenses/`.

PostgreSQL, Keycloak/OIDC, an application worker, the mock ERP, MapLibre/PMTiles assets, and routing adapters are future phase additions. No application database, migration, user account, delivery endpoint, or background job exists yet.

## Supported local toolchain

- Node.js `>=24.11.0 <25` (Node 24 LTS); exercised with `v24.19.0`.
- npm `>=11.1.0 <12`; exercised with `11.1.0`.
- Exact JavaScript dependency versions are in `package.json` and `package-lock.json`.
- Repository-scoped `.npmrc` uses legacy peer resolution because the pinned `openapi-typescript 7.13.0` still declares TypeScript 5.x while its checked generator is retained with TypeScript 6.0.2. Do not remove that setting until the generator declares compatible peers and the contract drift suite passes after an upgrade.

This range is the common supported overlap of the pinned Vite 8, Vitest 5, Fastify 5, and lint/type tooling. CI uses Node `24.19.0` and the lockfile via `npm ci`.

## First setup and repeat setup

From the repository root in PowerShell:

```powershell
.\scripts\setup-app.ps1 -Check
```

The script validates Node/npm, creates `.env` from `.env.example` only when `.env` is absent, runs `npm ci`, and optionally runs all checks. Existing `.env` content is preserved. It does not invoke Docker, `setup.ps1`, Compose, map import, OSRM preprocessing, or any volume command.

Manual equivalent:

```powershell
Copy-Item .env.example .env  # only when .env does not exist
npm ci
npm run check
```

The example configuration is safe for local use and contains no secret:

```dotenv
TAWSEL_API_HOST=127.0.0.1
TAWSEL_API_PORT=3001
VITE_TAWSEL_API_BASE_URL=http://127.0.0.1:3001
```

All three values are required. Missing or malformed values stop the relevant process/build with a named configuration error. There is no production-secret fallback and no database URL.

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
| `npm run test:browser:ui` | Playwright fixture behavior/screenshots at required representative viewports |
| `npm run test:ci` | One-shot complete Vitest run |
| `npm run lint` | ESLint source checks |
| `npm run typecheck` | Strict TypeScript checks across all workspaces |
| `npm run build` | Shared/API compilation and web production bundle |
| `npm run check` | CI order: audit, lint, typecheck, all tests, build |

The integration project listens only on an ephemeral loopback port. It does not require the Engine or claim an Engine result. Database/locking/durability tests are intentionally absent until a real application PostgreSQL responsibility exists.

## CI

`.github/workflows/application-checks.yml` runs on application-workspace changes with read-only repository permissions. It uses the exact Node version, `npm ci`, and `npm run check`. CI has no Engine, database, identity, or map-data prerequisite.

## Failure guide

| Symptom | Meaning and response |
| --- | --- |
| `Configuration error: TAWSEL_API_HOST is required` | Create/review `.env`; do not add an implicit public bind. |
| `TAWSEL_API_PORT must be an integer...` | Use a free port from 1–65535; local default is 3001. |
| Web build reports `VITE_TAWSEL_API_BASE_URL` | Provide an absolute `http://` or `https://` URL. |
| Port 3001 or 5173 already in use | Stop the earlier app process or deliberately update the local application configuration. Do not move VROOM from 3000 to mask the conflict. |
| `/health` says `engine=not-checked` | Expected in Phase 01; inspect Engine services separately when routing work begins. |
| Docker is unavailable | Application install, checks, and health still work; Engine status remains unknown. |

## Preservation boundary

Application setup must not write under `data/`, alter the `nominatim-data` volume, run imports, rebuild OSRM profiles, or edit `docker-compose.yml`, `setup.ps1`, `profiles/motorcycle.lua`, or `vroom-conf/config.yml`. A repeat setup may replace only dependency artifacts managed by `npm ci`; it preserves `.env`, Engine data, Stitch exports, and unrelated files.
