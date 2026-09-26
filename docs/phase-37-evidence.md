# Phase 37 — Equivalent authorized Excel exports

26 September 2026. Starting clean HEAD `501a1ae` (`erp plan files`), with Phase 36 at `32aad03`. No repository `AGENTS.md` was present. Runtime identifies Codex/GPT-6; the exact picker suffix and reasoning setting are unavailable, so the prompt recommendation `gpt-5.6-sol / high` is not asserted as observed. The user explicitly authorized the final commit and push.

## Prerequisite and runtime

Inspected the Phase 36 report service, query/result model, URL filters, authorization boundary, snapshot contract, public client, ERP references and its 14-test focused result. The export consumes the same `ReportWorkday` object inside the same repeatable-read authorization transaction; it does not introduce a second report aggregation.

The default host exposed Node 22.17.0 and a broken global npm prefix. Final build verification explicitly selected bundled Node 24.19.0 and an ignored local npm 11.6.2 tool copy, satisfying the repository engine ranges. PostgreSQL 18 ran from the existing isolated local tooling on port 55432. The repository's Cyrillic path prevented PostgreSQL initialization directly, so the same workspace was exposed temporarily as `T:` for the local database script. No Engine import or production database was touched.

## Checkpoint A — contract, snapshot and authorization

Added a public export request/status schema and three real operations: create, status and download. Creation requires both `reports.read` and `reports.export` in the same authorized report transaction and stores the exact returned snapshot. Status and download reauthorize the current principal, workday, normalized filters, original report kind, capabilities and visibility hash. Export IDs are opaque but never bearer permissions: another identity, branch, kind, changed visibility or revoked capability is denied.

The store deduplicates the same owner/kind/workday/snapshot/filter request. A later report change does not rewrite the frozen workbook; a stale snapshot supplied at creation returns `snapshot_changed`. Focused integration evidence also proves guessed IDs and cross-branch access cannot reveal status or bytes.

## Checkpoint B — real workbook and bounded artifacts

ExcelJS 4.4.0 generates a real XLSX from the frozen report object. Arabic right-to-left sheets cover report metadata, summary, collection, attempts, result history, timing and return disposition. Metadata records normalized filters, snapshot, generation time and `Africa/Cairo`. Counts and quantities remain numeric; money is emitted as exact minor-unit text alongside explicit currency so JavaScript/Excel floating-point conversion cannot change stored digits.

User-controlled names, addresses and IDs are written as literal strings. The test recipient `=1+1` is parsed back as a string with no formula or hyperlink. Missing and uncertain timing values use the same explicit report terms. The private in-memory store allows at most 16 ready artifacts, 4 MiB per file and 64 retained records, with a ten-minute file lifetime and ten-minute expired tombstone; expired bytes are removed and return HTTP 410. This lifecycle is intentionally process-local and is not claimed as durable or multi-instance storage.

`npm run test:report-export`: **3/3 passed** against isolated PostgreSQL with workbook parsing. It covers row/value equivalence, exact minor units, literal formula-looking text, request deduplication, frozen snapshot drift, stale snapshot rejection, capability revocation, branch/identity isolation, a real HTTP XLSX response and expiry cleanup.

## Checkpoint C — connected download

The selected report page now exposes concise creating, ready, downloading, failure and expired states. It sends the exact current workday, kind, normalized filters and snapshot, and only enables download for a ready artifact. A small prerequisite URL defect was repaired: report routing now forwards only `driverId`, `branchId`, `roundId` and `outcome`; the `kind` selector no longer leaks into report filters.

`npm run test:browser:report-export`: **1/1 passed** in actual Chromium against Vite, Fastify and isolated PostgreSQL. The authenticated principal is an explicitly labelled fixture rather than Keycloak. The browser filters the connected two-stop report, creates and downloads the XLSX, then a separate ExcelJS process opens that exact downloaded file and confirms the snapshot, sheets, one report row and literal `=1+1`. Removing `reports.export` after creation makes the real download return 403 and the UI displays the failure. [Ready-state capture](../output/playwright/phase-37-export-ready.png). Public evidence is retained locally at `.local/phase-37-browser-evidence.json`.

`npm run test:erp:report-export -- .local/phase-37-browser-evidence.json`: **passed**, validating the public status shape, actual XLSX inspection evidence and post-revocation denial.

## Final verification

| Check | Observed result |
| --- | --- |
| `npm run contracts:generate` | Generated **30 schemas / 267 valid / 166 invalid examples / 186 operations**. |
| `npm run contracts:lint` | Passed; retained pre-existing callback 302-only warning. |
| `npm run contracts:check` | Passed with the same inventory. |
| `npm run test:report-export` | **3/3 passed** on actual isolated PostgreSQL. |
| `npm run test:reporting` | **14/14 passed**, protecting the source report behavior. |
| `npm run test:browser:report-export` | **1/1 passed** in actual Chromium with a parsed downloaded workbook and live authorization revocation. |
| `npm run test:erp:report-export -- .local/phase-37-browser-evidence.json` | Passed. |
| `npm run lint` | Passed. |
| `npm run typecheck` | Passed across workspaces and scripts. |
| `VITE_TAWSEL_API_BASE_URL=http://127.0.0.1:3001 npm run build` | Passed across foundation, API, web and mock ERP; production fixture isolation passed and the PWA precached 17 assets. |
| `npm run audit` | Exits 0 at the repository's high-severity threshold; npm reports two moderate transitive `uuid` findings under ExcelJS. |

The initial workbook inspector typecheck rejected the Node buffer type expected by ExcelJS; it was corrected with the library's exact `load` parameter type. Initial browser attempts exposed the missing Chromium binary, the direct-route filter defect and a Windows Vite child-process teardown hang. Chromium was installed through Playwright, the route filter was narrowed, and a programmatic Vite wrapper now exits through an explicit stop file. The final build also exposed the mock ERP Vite root converting a file URL by editing its pathname, which percent-encoded the Cyrillic workspace segment; it now uses Node's `fileURLToPath`. An early integration assertion assumed database row order; it was corrected to compare stable keys without weakening production behavior.

ExcelJS 4.4.0 was the latest stable release found in the library's primary package/repository documentation during implementation. The reported moderate advisory affects the transitive `uuid` package. ExcelJS imports `v4` only in its conditional-formatting transform; this generator creates no conditional formatting and calls no UUID API. `npm audit fix --force` proposed a breaking downgrade to ExcelJS 3.4.0, so it was not applied. This is a recorded dependency limit, not a claim of zero vulnerabilities, and should be revisited when the upstream dependency changes.

## Changed artifacts and handoff

- API and workbook: `apps/api/src/reporting/{models,service,routes,export}.ts` and the focused integration test.
- Contract/client: `contracts/report-export.schema.json`, OpenAPI/operation inventory, generated types/reference/coverage and `ReportingClient` export methods.
- UI/browser/demo: reporting page/styles, development-only fixture route, browser/API servers, workbook inspector, Playwright configuration/test and public ERP conformance checker.
- Canonical docs: reporting lifecycle and exact Phase 38 handoff, phase index, ERP planning/mapping/quickstart, API-client guide, this evidence and the implementation ledger.

The exact Phase 38 input is the [authorized export handoff](reporting.md#exact-phase-38-handoff): instrument duration, bytes, count and expiry against the published bounds without weakening current authorization, introducing a parallel report query or treating the in-memory fixture/store as production capacity evidence. Phase 38 was not executed. Original Stitch exports and Engine datasets/mounts remain unchanged. No physical device, commercial ERP, deployment or production storage claim is made.
