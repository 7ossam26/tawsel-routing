# Routing boundary (Phase 12)

Current amendment: [D-113](phases/decision-map.md) removes bicycle. [Two-mode verification](verification/two-mode-routing-2026-10-03.md) records the new scope independently of dated Phase 12–16 results.

`apps/api/src/engine/index.ts` exports `RoutingEngine.route`, `.table`, `.optimize` and typed `EngineError`. Canonical normalized models live in `contracts/routing.schema.json`, exposed as generated `Routing*` client types. These are internal planning building blocks; no raw Engine HTTP endpoint is exposed and no planning-job HTTP operation is implemented by this phase.

`GET /api/v1/routing/profiles?kind=company|personal` is the authenticated metadata read assigned to P12 (`routing.getVehicleProfiles`). It requires current `planning.manage` or `execution.own`, returns the two public modes `car` and `motorcycle`, the 600-second customer default and `liveVerification: not-checked`. It makes no Engine call, leaks no service URL and grants no planning authority. ERP service credentials cannot impersonate a browser session.

## Reproduce

```powershell
npm run test:engine
npm run engine:demo
npm run test:erp:routing
npm run engine:live
```

The demo starts ephemeral loopback fixture servers and exercises both adapter modes (six route/table/optimization calls), recording `.local/engine-demo-report.json`. It requires no datasets. `engine:live` attempts route, table and optimization separately for each configured mode, records `.local/engine-live-report.json`, and exits nonzero on any dependency failure. It never starts containers, downloads OSM or imports data. Live probe coordinates are a small Cairo sample; a pass establishes only that sample's operation, not national coverage/performance or suitability.

## Service configuration

| Public mode | OSRM host port / route token | Dataset prefix | VROOM profile / internal OSRM host |
| --- | --- | --- | --- |
| car | 5001 / driving | `${OSRM_CAR_DATASET}`; local default egypt-260913.osrm, target egypt-261002.osrm | car / osrm-car:5000 |
| motorcycle | 5003 / driving | egypt-motorcycle.osrm | motorcycle / osrm-motorcycle:5000 |

OSRM's path token does not select a new dataset in one running server. The distinct origin and preprocessed dataset provide the mode. The VROOM config contains only `car` and `motorcycle`; bicycle/bike are rejected without a provider call. Rebuild the configured VROOM image after removing the old mapping: `deploy/Vroom.Dockerfile` copies it to `/conf/config.yml` and runtime `/vroom-express/config.yml`, avoids the upstream write during `read_only` startup, and uses writable `/tmp` for logs. Inspect the running image/configuration as well as its digest. Configure `TAWSEL_OSRM_CAR_URL`, `TAWSEL_OSRM_MOTORCYCLE_URL`, `TAWSEL_VROOM_URL` as private operator-owned HTTP(S) origins, without credentials, paths, query or fragment. Distinct OSRM origins are mandatory; there is no all-car fallback. Never bind these settings from public request data. Production must restrict Engine network access.

Reuse one `RoutingEngine` per worker process. `TAWSEL_ENGINE_TIMEOUT_MS` defaults to 5000 (1–60000), `TAWSEL_ENGINE_MAX_CONCURRENT` to 4 (1–32); responses are bounded to 2 MiB. Saturation fails immediately; no automatic retries or hidden queue. Cancellation and deadlines apply through body reads, and redirects are refused. P13 must coordinate process count/job concurrency and retry policy.

## Normalized behavior

All boundary coordinates use named `latitude` / `longitude`. Provider arrays and URL coordinates are converted only in adapters. Durations are seconds, distances metres. Schema validation rejects positional coordinates, unknown modes/origin kinds and extra input properties. Task IDs are unique opaque application IDs; sequential numeric solver IDs are private and request-local. Assigned and unassigned IDs must cover every input exactly once.

Origin kinds are `last-confirmed-stop`, `manual-pin`, `branch-pin`. The caller must resolve these from authorized confirmed physical state or explicit human selection. A kind label is not authentication; do not derive origin from phone outcomes or device GPS. P13 must read coherent revisioned snapshots; P16 owns physical arrival semantics.

Customer service defaults to 600 seconds, with an optional explicit nonnegative estimate. Same-address customers retain separate jobs and service estimates. Last customer is the default endpoint. A company branch endpoint has a required separate `serviceEstimateSeconds`, added after endpoint travel; it is not a customer job, handover or actual arrival. A personal fixed endpoint is supported. Branch endpoint reserves one of the 50 stops. Personal branch custody and company fixed endpoints are rejected at this boundary.

Route results require OSRM road geometry and complete legs. No geometry is invented. Table null entries are explicit unreachable cells and yield `partial`; no fallback speed is requested or accepted. VROOM results are candidates with `policyValidated: false`, including when all jobs are assigned. They expose estimated relative arrival/finish offsets from zero; travel excludes service and waiting. Per-visit travel/distance fields are cumulative. An all-unassigned result has no visits and zero totals; those zeros do not describe a usable route. The requested endpoint remains an input, not completed activity. VROOM geometry is not exposed; obtain road geometry through OSRM for the eventual validated order.

Errors contain only `code` and `provider`: invalid input/config, busy, timeout, cancellation, unreachable service, HTTP failure, provider error, invalid response, no route/table. Missing IDs, duplicate/foreign jobs, unexpected vehicles, violations, inconsistent timing/service/totals, missing geometry and malformed matrices fail validation. No raw provider message or URL is copied to the public normalized failure.

Call Engine work **after committing domain commands and releasing transactions**. The adapter owns no pool, transaction or state mutation. A real PostgreSQL receipt test commits ERP receipt, invokes a failing controlled HTTP Engine, then reads retained receipt/held state/replan/event intent from an independent pool. Actual delivery outcomes are not implemented until P17, so no outcome transaction proof is claimed here.

## Deployment evidence and handoff

**Historical Phase 12 observation, 23 September 2026:** all nine live calls failed `unavailable`; Docker was absent and `data/` contained only `.gitkeep`. Runtime versions, image identity, dataset provenance/compatibility, motorcycle suitability and actual profile success were unverified by that run. Compose then used OSRM `latest`, while the historical VROOM startup pinned `v1.15.0`. Those dated failures remain preserved; they are not the current two-mode result.

**Current local observation, 3 October 2026:** six live route/table/optimization checks passed separately for car and motorcycle against the existing local OSRM datasets and a newly built configured two-mode VROOM candidate. The report records OSRM `v26.9.0`, VROOM `1.15.0`, running image identities/mounts and all six results; [two-mode verification](verification/two-mode-routing-2026-10-03.md) records the conditions. This is a local Cairo sample, not evidence that the new October target dataset has been preprocessed, that the VPS has been deployed, or that motorcycle routing is suitable throughout Egypt. Preserve the old local datasets and services.

The [Dokploy experiment](dokploy-pilot.md) uses the inspected OSRM digest to prepare the verified `egypt-261002.osm.pbf` on the VPS, one bounded stage/profile at a time, then imports a fresh independent Nominatim database with routing stopped. Target preprocessing/import, full asset/build provenance and six target live results remain pending. Before runtime deployment, inspect image IDs/digests, `osrm-routed --version`, `vroom --version`, actual mount/config paths and preprocessing records. Filenames and local runtime success alone do not establish source provenance; never rewrite existing live mounted data to satisfy a check.

Provider API baselines consulted during Phase 12: [OSRM v5.27.1](https://raw.githubusercontent.com/Project-OSRM/osrm-backend/v5.27.1/docs/http.md), [VROOM v1.15.0](https://raw.githubusercontent.com/VROOM-Project/vroom/v1.15.0/docs/API.md). No new library/image installation or Engine setup/config/Lua/mount change was performed by that September phase. The October amendment changes the two-mode source configuration and builds the configured VROOM candidate separately; the target release still requires its final immutable image and observed deployment results.

At the Phase 12 handoff, P13 could rely on typed validated adapters, cancellation/error handling and normalized schema/client models, while durable jobs/snapshots, policy validation and activation belonged to later phases. Priority alone cannot establish urgent-first ordering. No active round publication, manual fallback UI, queue, dataset refresh or next phase was executed **by Phase 12**. [Ordered historical evidence](phase-12-evidence.md).

## P13 follow-through (23 September 2026)

The P13 [durable worker and API](planning-jobs.md) adopted these adapters outside claim/publication transactions, stored candidate drafts/forecasts and fenced expired leases/obsolete inputs. At that dated handoff, browser planning interfaces were implemented and P14 route-policy validation/P15 activation remained later-phase work. Its live probe again failed all nine calls; fixture routes were not live Engine evidence. The current D-113 local run records six passing operations for the retained modes; six independent target results are still required.
