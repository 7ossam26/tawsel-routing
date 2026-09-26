# Authorized workday reports

Phase 36 uses `Reporting.workday` as the single report query. Session reads require current `reports.read`, with tenant, branch and personal own-driver bounds applied in SQL before history or aggregation. Every read uses one PostgreSQL REPEATABLE READ transaction and retains the existing access/revocation locks. A changed grant takes effect on the next read; a report snapshot is never a permission token.

`GET /api/v1/reports/workdays?kind=personal|company` discovers explicit authorized workdays. Optional `driverId`, `branchId` and exclusive UTC `before` filter the list. `GET /api/v1/reports/workdays/{workdayId}?kind=…` accepts `roundId`, `driverId`, `branchId`, `outcome` and `snapshotId`. Filters are closed; foreign resources are unavailable. Workday identity follows actual first-start/End-day lifecycle, not the calendar date. All wire instants are UTC; clients use IANA `Africa/Cairo` with date and offset, including real offset changes.

`definitionVersion=1.0.0`, normalized `filters`, `snapshotId`, `asOf` and `displayTimeZone` accompany every report. The content hash includes the current access context and authorized content, excluding the read timestamp. Supplying an expected `snapshotId` returns the same content or `409 snapshot_changed`; it never silently substitutes newer totals. The report is not a persisted historical snapshot lookup. Phase 37 validates the visible ID through this query, retains the returned object for export, and reauthorizes downloads using that same report query. The [Phase 42 public consumer](verification/integration.md) also validates the actual downloaded workbook against the report snapshot and task IDs.

## Counts and filters

- Shipments are distinct task IDs, including separate shipments at the same address. The latest admitted attempt in the selected scope supplies each shipment's effective outcome. A retry adds an attempt, never a shipment.
- Attempts are distinct attempt IDs; a carried unfinished attempt admitted in multiple rounds is counted once for the workday. A processed attempt has an accepted effective outcome. Failure, partial and full are different outcomes; deferral is not delivery or a processed outcome.
- `fullDeliveryPercent` is full shipments / selected shipments, rounded to one decimal; zero denominator is null. Six full, one failure, eleven unfinished means seven processed out of eighteen, six delivered. Sixteen full and two failed means 88.9% full delivery.
- Outcome filtering selects shipments by their latest scoped result (or explicit deferred/unfinished state), retaining all their selected-scope attempts for money/history. `counts` describes that selection. `scopeCounts` retains all authorized round/branch/driver shipments before the outcome filter, so the UI can label the denominator. Round timing remains the round context, regardless of outcome detail selection.
- Branch visits are separate service activities, never customer shipments or successful deliveries.

## Quantities and money

Effective accepted outcome revisions replace earlier versions of the same attempt. `history` and `corrections` retain originals and links. Rejected, review-required and unsent local actions do not contribute to totals. `pendingLocalActions=not-known-to-server` is deliberate: a server report cannot count unsent phone records.

Collection is the driver's reported amount, not remitted cash. Exact integer minor-unit strings group by currency **and** exponent. Goods, shipping and explicitly unpaid shipping remain separate. Unreported attempts remain counted rather than inferred as zero collection. Outstanding unpaid shipping uses the maximum explicit fee per dispatch cycle, less shipping collected across its accepted attempts, bounded at zero. Source prepaid allocations are already excluded by the execution calculation; the report never adds them back. V1 source/outcome writers currently accept EGP only; generic multi-currency accumulation has labelled fixture evidence, not a claim of multi-currency intake.

`pieces` is the **current accepted disposition, as of this snapshot, of the selected dispatch cycles**. It is distinct from historical workday delivery counts: later source receipts/dispositions can reduce held pieces. Each cycle/line is counted once using its latest attempt and effective correction, plus its actual receipt/disposition balance. Dispatched = delivered + held + received + lost + damaged; returnRequired is a subset of held, not an additional amount. Never sum per-attempt source quantities or repeated return histories. B2C returns null for pieces and has no branch custody surface.

## Timing definitions

`GET /api/v1/reports/workdays/{workdayId}/rounds/{roundId}/timing` projects the round from the same report snapshot and filters. First-start forecast/workload references remain exact stored identities. Revised forecasts are read from stored validated/manual/branch publications during the active round interval. Each stop compares the same task, attempt and dispatch cycle; source, assignment and pin assertions must match the action. The last forecast captured before recorded physical arrival (or phone resolution) is the stop's latest comparison. A forecast written after completion cannot rewrite its expected time. Missing manual estimates remain null.

Physical actuals are the original action observation, never server receipt. `recordedAt` exposes reception/acceptance provenance separately. A later outcome correction changes quantities/money but preserves the original physical resolution boundary. Accepted evidence adoption uses the retained original device observation/context. Clock `unknown`/`uncertain`, nonzero estimated offset, missing boundaries, reversed times, device/generation changes and interruptions suppress derived duration with an explicit reason. No automatic clock adjustment, GPS dwell or travel inference from a phone call is made.

Migration 0027 adds immutable observation/version capture to existing command metadata in the same command transaction. Legacy start observations are unavailable; a server start timestamp does not retroactively supply them. Legacy actions without retained version assertions cannot prove forecast identity: their comparisons return `identity-unavailable`, even when their physical action times remain usable. Admission versions are not a substitute for the version used at arrival. The report separately names accepted start/end instants and physical action start/end. Duration requires matching known device boundaries.

Round comparison includes original and latest forecast/workload, unfinished attempts and branch pauses. New admissions, retries, deferrals or changed source/pin scope are labelled changed workload. Ending a round with remaining attempts is `ended-unfinished`; later carried work cannot make that round complete. Finish differences are unavailable for changed scope, interruptions, unfinished scope, hidden parts of a shared round or an unobserved fixed/branch endpoint. A branch visit has its own estimate/arrival/resume/service, not a customer success. Subset viewers receive only authorized stop/branch details and no whole-round forecast, duration or totals.

[Ordered checkpoint evidence](phase-36-evidence.md). Primary implementation references: [PostgreSQL repeatable-read semantics](https://www.postgresql.org/docs/18/transaction-iso.html#XACT-REPEATABLE-READ), [Intl.DateTimeFormat and IANA time zones](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat). Existing package pins are retained.

## Reproduce and consume

Use the existing local PostgreSQL and Keycloak setup; .env.database.local and .local/identity/secrets.json stay local. With supported Node 24, run:

```powershell
npm run test:reporting
npm run reporting:demo
npm run test:erp:reporting -- .local/phase-36-browser-evidence.json
```

The demo creates disposable issuer users and an isolated database, starts the real API on 3036 and web app on 5173, and cleans them up. It drives personal mobile and scoped company desktop reports through real local Keycloak. Planning uses the actual worker with a labelled controlled HTTP routing provider. It captures initial/revised workload, phone-only uncertainty, a later correction, unfinished closure, filter reload and live report-grant revocation. Public JSON stays under .local; selected interaction captures are in output/playwright/phase-36-*.png. The portable consumer checker reads only public messages and imports public types. It needs no server code or database credentials.

The React page is /reports?kind=personal|company, with selected workdays at /reports/workdays/:workdayId. Account/day/closure/monitoring links retain account scope. The driver sees counts before expanding timing or history, optional round/outcome filters, and simple optional collection. Company views additionally show source fees and current piece disposition. Online report reads clear obsolete content on refresh/denial; pending local actions are a separate account-scoped notice.

## Exact Phase 37 handoff

The Phase 36 handoff remains the single `Reporting.workday` query, normalized filters, snapshot assertion, timing/uncertainty definitions and authorization predicates described above. Phase 37 consumed that exact object; the completed export lifecycle is below.

## Authorized Excel export

`POST /api/v1/reports/workdays/{workdayId}/exports?kind=personal|company` accepts the visible `snapshotId` and the same optional round/driver/branch/outcome filters. Creation requires both current `reports.read` and `reports.export` in the same repeatable-read transaction. It calls the single `Reporting.workday` implementation with the snapshot assertion and freezes that returned object; there is no second aggregation query. Generation is synchronous for the bounded workday report, so success returns a `ready` status. An identical unexpired request by the same identity and visibility scope reuses its artifact.

`GET /api/v1/report-exports/{exportId}` returns `ready` or `expired`. `GET /api/v1/report-exports/{exportId}/download` reauthorizes the original authenticated identity, both capabilities, the workday/filters and the exact captured visibility fingerprint before returning bytes. Changed branches/capabilities, another identity or another tenant cannot use a guessed ID. Report drift after creation does not rewrite the frozen file. A new creation with an old visible snapshot returns `409 snapshot_changed`.

Artifacts are private in-process buffers: at most 16 ready files, 4 MiB each, with ten-minute expiry and a bounded ten-minute tombstone for the explicit expired state. Expiry and capacity eviction delete workbook bytes; download then returns `410 export_expired`. A process restart drops the in-memory jobs and clients recreate them from a current report. This is deliberately not persistent object storage or a multi-instance job queue; Phase 38 measures resource/capacity behavior and Phase 39 owns deployment topology.

The real `.xlsx` workbook has Arabic RTL sheets for metadata, summary, exact currency/minor-unit collection, attempts, outcome history, timing and returns. Exact minor-unit values and IDs are stored as literal text; counts/quantities stay numeric. Recipient names and any value beginning with `=`, `+`, `-` or `@` are assigned as string cells, never formulas or hyperlinks. Missing and uncertain observations retain the report's explicit Arabic meaning. The workbook declares `Africa/Cairo`, the normalized filters, definition version and snapshot ID.

The report page exposes one creation action, a real preparing state, ready/expiry information, download progress and actionable errors for changed/expired/denied files. It states that unsent phone actions are excluded. Opening a direct report link now forwards only the four closed report filters; the earlier query handling incorrectly included `kind` as an unknown report filter and was repaired as the small prerequisite defect.

Reproduce with supported Node 24 and local PostgreSQL:

```powershell
npm run test:report-export
npm run report-export:demo
npm run test:erp:report-export -- .local/phase-37-browser-evidence.json
```

The integration test uses isolated real PostgreSQL and parses generated XLSX bytes. The browser demo uses Chromium, Fastify and isolated PostgreSQL with a labelled authenticated principal fixture; it is not Keycloak, a physical device or a commercial ERP claim. [Ordered evidence and exact limits](phase-37-evidence.md).

## Exact Phase 38 handoff

- `contracts/report-export.schema.json`, the three verified-local export operations in OpenAPI, generated types/reference and `ReportingClient` define the public lifecycle.
- `apps/api/src/reporting/export.ts` owns formula-free workbook generation, identity/visibility binding, deduplication, limits and expiry. `service.ts` remains the only report aggregation and supplies atomic create authorization plus lightweight current download authorization.
- `apps/api/test/integration/report-export.test.ts` proves real database scope, snapshot freezing/drift, current revocation, expiry, XLSX parsing and literal formula-looking text. The browser evidence proves connected filtering, creation, download, workbook inspection and post-revocation denial.
- Phase 38 may instrument generation duration/bytes/count/expiry and exercise load against these bounds. It must not treat the in-memory store as durable/multi-instance storage, loosen reauthorization, add a parallel report query or claim production capacity from the focused Phase 37 fixtures.

## Phase 38 export observations

The private operator metrics include bounded workbook-generation timing/error samples and live export-store records, ready/expired counts, retained bytes and configured limits. They contain no workbook/user data and do not change current authorization, snapshot equivalence or process-local lifetime. The owner can correlate report/export HTTP duration with query/transaction/pool pressure using the [diagnostic runbook](diagnostics.md). Measurements and remaining target-host limits are in [performance evidence](verification/performance.md).
