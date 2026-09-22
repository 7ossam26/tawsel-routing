# Phase 12 — Routing adapter evidence

Started 22 September, continued 23 September 2026 (Africa/Cairo). Starting HEAD `2eed5ea` (`phase 11`); clean working tree; no applicable AGENTS.md found in repository or ancestors. Runtime identifies GPT-6; exact picker suffix/reasoning is not exposed. Requested Astra/high is not claimed as an observed setting.

Read actual P02 canonical schemas/generator/tests, P11 location persistence/provider/tests, master-plan sections 4/9, current discovery through D-112, phase index/coverage/decision map/status, retained Engine context/Compose/motorcycle Lua/VROOM config. Prerequisites: `npm run test:contracts` PASS 185; `npm run test:locations` PASS 9 with isolated PostgreSQL. No prerequisite repair required.

## A — profile/config boundary

Canonical `routing.schema.json` and generated consumer types name latitude/longitude, seconds/metres, explicit physical/manual/branch origin, three public modes, separate endpoint/branch estimates and normalized candidates. No HTTP planning endpoint is promoted. Internal config requires distinct OSRM origins, safe URL origins and finite bounds; request builders use exact retained service mapping and private numeric ID reconciliation. Customer default is 600 seconds; default endpoint omits VROOM end. Branch endpoint estimate is separate from customer jobs. Company fixed endpoint and personal branch custody are rejected.

Configured: OSRM `latest` (not an immutable pin), VROOM historical `v1.15.0` outside Compose; car 5001 / egypt-260913, bicycle 5002 / egypt-bicycle / VROOM `bike`, motorcycle 5003 / egypt-motorcycle. Motorcycle Lua API 4. VROOM internal destinations use service DNS on port 5000. `docker version` / `docker ps` unavailable (command absent); local `data/` contains only `.gitkeep`. Actual versions, datasets and compatibility cannot be inferred from historical reports. No Engine startup, import, image pull or mount edit.

Primary references checked online: [OSRM v5.27.1 HTTP API](https://raw.githubusercontent.com/Project-OSRM/osrm-backend/v5.27.1/docs/http.md), [VROOM v1.15.0 API](https://raw.githubusercontent.com/VROOM-Project/vroom/v1.15.0/docs/API.md). OSRM reference is an adapter API baseline, **not** proof that retained `latest` data/runtime is v5.27.1. Existing image cannot safely be repinned against unavailable data; deployment must identify/pin compatible build artifacts before service use.

Before B: `npx vitest run --project fast apps/api/test/fast/engine-adapters.test.ts` PASS **5 tests**; `npm run typecheck -w @tawsel/api` PASS; `npm run contracts:generate` PASS (11 schema files, 107 valid/70 invalid examples, 151 unchanged operation IDs). Remaining dependency: inaccessible live Engine and unavailable dataset-build identity.

## B — provider behavior

Implemented one shared process-local bounded transport (5s default including body, four concurrent calls, 2 MiB response limit, saturation fails fast, cancellation, no retry queue or redirects). Errors expose only fixed codes/provider names. Route conversion requires actual OSRM LineString/legs; table null pairs become explicit unreachable cells and fallback-speed estimates are rejected. Optimizer conversion checks known unique exhaustive IDs across assigned/unassigned, vehicle, positions, coordinates, service, cumulative times/distances, totals and violations; partial candidates remain partial, never urgent-first proof. All output models validate against canonical schema. RoutingEngine computation accepts no DB handle and performs no domain mutation; the separate profile-metadata HTTP handler uses session/access reads without calling providers.

Before C: `npx vitest run --project fast apps/api/test/fast/engine-adapters.test.ts` PASS **26 tests**; `npm run typecheck -w @tawsel/api` PASS. Includes real controlled loopback HTTP for payload/path conversion, stalled-body timeout, overload, cancellation/capacity release, bad JSON, HTTP failure, oversized response and redirect rejection; fixtures for missing/unknown/duplicate IDs, reversed coordinates, malformed legs/geometry/matrices, provider errors, branch/fixed endpoint estimates and explicit partial data. This is controlled boundary evidence, not live Engine evidence. Live versions/datasets remain unavailable.

## C — fixtures, live attempts and canonical handoff

- `npm run test:engine`: PASS **30 tests**, adding HTTP 400 NoRoute/NoTable, real closed-port failure, pre-cancellation and in-flight caller-mutation protection. Route geometry endpoints are checked against snapped waypoints. This is deterministic fixture/controlled HTTP evidence.
- `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/b2b-intake-admission.test.ts -t 'prepared is upcoming'`: PASS **1**, 17 intentionally filtered. Actual ERP receipt commits before controlled HTTP 503; independent PostgreSQL pool reads held state, accepted command receipt and pending replan/event intent afterward. No transaction was mocked. Actual outcome handlers remain P17, so no unimplemented outcome claim.
- `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/session-auth.test.ts -t 'P12:'`: PASS **1**, 18 intentionally filtered. Real PostgreSQL/session boundary with signed issuer fixture: anonymous 401, authorized company/personal modes, immediate capability revocation 403, invalid query 400 and no private provider configuration in response. Final catalog review identified the P12-owned metadata read and it was completed here, without adding P13 job APIs.
- `node --import tsx scripts/engine-demo.ts`: PASS, all **9** fixture-backed route/table/optimization calls across all modes; `.local/engine-demo-report.json` and `.local/engine-demo-output.txt`. `node --import tsx tests/erp-conformance/routing.ts`: PASS, valid partial result and rejected false completion/duplicate/missing mappings. `npm run typecheck` passed before the final schema annotation adjustment.
- `node --import tsx scripts/engine-demo.ts --live`: exit **1** as intended for missing dependencies. Recorded `2026-09-22T21:48:34.427Z` (23 September Cairo), `.local/engine-live-report.json`. Car route/table (5001), motorcycle route/table (5003), bicycle route/table (5002), and three separate optimization requests to VROOM (3000): **all nine `unavailable`**. Docker inventory unavailable; local data contains `.gitkeep` only. Actual running versions, loaded profiles, mounts, dataset build provenance/compatibility and real route quality remain **unverified**, not fixture passes.
- `npm run contracts:generate` / `contracts:check`: PASS, 11 canonical schema files, 108 valid / 70 invalid examples and 151 operation IDs. Three P12 routing rows updated with internal/public distinction. All planning job/publication rows remain designed. ERP planning input/mapping/consumer quickstart/conformance and generated client/reference were updated together.
- First `npm run check` stopped at API typechecking: OpenAPI generator treats a JSON Schema `default` annotation as a required TypeScript property. Removed that annotation, documented the optional 600-second fallback in the schema description instead and regenerated. Runtime semantics and optional input were preserved. Full rerun recorded below when complete.
- Second full check reached **382 passed / 2 failed**: the two P02 availability assertions allowed only prior-phase operation families/paths. Updated the allowlist to exactly the three P12 operations and only `/api/v1/routing/profiles` as public HTTP; `npm run test:contracts` then PASS **191**. No runtime test failure was hidden by changing an expected provider result.
- Early shell runs used system Node **25.2.1** / npm **11.6.2**, outside the repository's Node 24 range. Found the existing bundled Node **24.19.0** and existing local npm **11.1.0** for final verification; no installation or dependency edit. A first PATH attempt incorrectly used npm's internal `bin` directory and failed before checks; corrected it to the existing generated `.bin` shims.
- `git diff --check`: PASS. `git diff --exit-code -- docker-compose.yml setup.ps1 profiles vroom-conf stitch-export TAWSEL-ENGINE-CONTEXT.md STACK-CONTEXT.md`: PASS (unchanged). No imports, image pulls, Engine startup, dataset writes or map changes. No browser test required or claimed: no UI changed.

Self-review: repaired stale P10/P11 status-table rows against their existing dated evidence; no prerequisite code repair. Retained `latest` OSRM is explicitly not relabelled as a verified pinned deployment. No owner/external review feedback received.

Final verification runtime command (PowerShell, process-local PATH only):

```powershell
$env:PATH = 'C:\Users\jo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + (Join-Path (Get-Location) '.local\runtime\node_modules\.bin') + ';' + $env:PATH
node --version # v24.19.0
npm --version  # 11.1.0
npm run check
```

Ordinary supported Node 24/npm 11 installations can run the same npm scripts without these host-specific paths.

### Final results

- Node **24.19.0**, npm **11.1.0**: `npm run check` passed audit (**0 vulnerabilities**), ESLint, OpenAPI validation, generated contract drift checks, all workspace/script typechecks and the entire Vitest suite (**18 files / 384 tests passed**, 96.61s). Shared/API builds passed. The command then stopped at web build because this shell lacked the required `VITE_TAWSEL_API_BASE_URL`; this is recorded as a failed full command, not a clean exit.
- Set `$env:VITE_TAWSEL_API_BASE_URL = 'http://127.0.0.1:3001'` (the existing documented local value), then `npm run build`: **PASS** for shared/API/web and production fixture isolation. No code change or test rerun was necessary for this environment-only correction. Existing redirect-only callback OpenAPI warning and MapLibre >500kB chunk warning remain unchanged; no new audit findings.
- Repeated `npm run engine:demo` and `npm run test:erp:routing` under Node 24/npm 11: **PASS**. Demo records `2026-09-22T22:00:47.660Z`, explicitly controlled HTTP. Live probe remains nine failed attempts, never promoted by this demo.
- `node .local/check-phase12-links.mjs`: **PASS**, 1,234 local file links in 15 changed Markdown files at that check (fragment/external URL validation excluded). `git diff --check` and retained Engine/Stitch preservation check passed.
- No UI changes, physical-device/browser claim, real ERP interoperability claim, new dependency/install, dataset mutation, commit, push, publication or next-phase execution. Review/handoff is ready within the documented live-service limits.

## Verified artifacts for Phase 13

| Paths | Reliance and limit |
| --- | --- |
| `apps/api/src/engine/{config,models,requests,transport,responses,index}.ts` | Validated typed route/table/optimization, bounded cancellation/concurrency, explicit errors and partial data. No database transaction/persistence or policy approval. |
| `apps/api/src/engine/routes.ts`, `apps/api/src/app.ts` | Session-authenticated supported-mode metadata; no provider health probe or URLs. |
| `contracts/routing.schema.json`, `openapi.yaml`, `operations.json`, examples; `packages/api-client/src/schema.d.ts`; generated reference/coverage | Named coordinates, seconds/metres, service estimates, endpoint and candidate/failure models; authoritative public metadata operation. |
| `apps/api/test/fast/engine-adapters.test.ts`, `test/support/engine-fixtures.ts`, P10/P07 integration tests | Controlled providers clearly separated from real PostgreSQL/session evidence. |
| `scripts/engine-demo.ts`, package scripts, `.env.example`, `tests/erp-conformance/routing.ts` | Reproducible controlled demonstration and explicit live probe/consumer checks. |
| `docs/engine-boundary.md`, ERP planning/mapping/quickstart, client README, phase coverage/status/index, operations/UI action notes | Deployment gaps and exact remaining ownership. |

P13 may combine these with verified P11 confirmed pins/revisions to build durable planning jobs. It must snapshot authorized input, release domain transactions before provider calls, recheck fingerprints and prevent stale publication. P14 owns urgent grouping, earliest availability, protected current prefix, stitching and full feasibility; priority alone is insufficient. Actual live profile/version/dataset proof remains required when services become available. No P13 execution, commit, push or publication.
