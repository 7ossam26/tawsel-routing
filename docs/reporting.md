# Authorized workday reports

Phase 36 uses `Reporting.workday` as the single report query. Session reads require current `reports.read`, with tenant, branch and personal own-driver bounds applied in SQL before history or aggregation. Every read uses one PostgreSQL REPEATABLE READ transaction and retains the existing access/revocation locks. A changed grant takes effect on the next read; a report snapshot is never a permission token.

`GET /api/v1/reports/workdays?kind=personal|company` discovers explicit authorized workdays. Optional `driverId`, `branchId` and exclusive UTC `before` filter the list. `GET /api/v1/reports/workdays/{workdayId}?kind=…` accepts `roundId`, `driverId`, `branchId`, `outcome` and `snapshotId`. Filters are closed; foreign resources are unavailable. Workday identity follows actual first-start/End-day lifecycle, not the calendar date. All wire instants are UTC; clients use IANA `Africa/Cairo` with date and offset, including real offset changes.

`definitionVersion=1.0.0`, normalized `filters`, `snapshotId`, `asOf` and `displayTimeZone` accompany every report. The content hash includes the current access context and authorized content, excluding the read timestamp. Supplying an expected `snapshotId` returns the same content or `409 snapshot_changed`; it never silently substitutes newer totals. The report is not a persisted historical snapshot lookup. Phase 37 must validate the visible ID through this query, retain the returned object for the export, and reauthorize downloads. It must not introduce a second aggregation query.

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

- contracts/reporting.schema.json, the three report.* HTTP reads in OpenAPI, canonical examples, generated types/reference and packages/api-client/src/reporting.ts define the boundary.
- apps/api/src/reporting/service.ts owns authorization, a coherent report and snapshot assertion. queries.ts owns accepted counts/money/current piece disposition; timing.ts owns stored forecast/action provenance. An exporter must consume the returned report, including definitionVersion, normalized filters, displayTimeZone, scopeCounts, uncertainty reasons and authorized timing scope.
- db/migrations/0027_reporting_provenance.sql preserves new accepted command observations/version assertions atomically. Legacy missing observations remain missing; the migration preserves existing rounds and forecasts.
- apps/api/test/integration/reporting-query.test.ts, the browser demo and public-response checker provide concrete expected behavior and negative authorization cases. The [evidence record](phase-36-evidence.md) distinguishes real services, controlled providers and unavailable external/device checks.

There is no persisted export job/file, historical snapshot retrieval, download authorization handler or spreadsheet generation. Phase 37 must implement that lifecycle, freeze this authorized object after a matching snapshot read, and check current access again at download. It must not recompute a parallel report or widen scope from a supplied ID.
