# Owner diagnosis and reproducible freshness measurement

Phase 38 supplies a small terminal operations view and an optional private HTTP surface. It leaves ordinary driver screens unchanged. See [measured runs and limits](verification/performance.md) and [ordered evidence](phase-38-evidence.md).

## Enable the operator surface

Apply additive migration `0028_worker_observations.sql` with the normal explicit migration procedure before deploying these workers. Set `TAWSEL_DIAGNOSTICS_TOKEN` to a separate random URL-safe secret (32–256 characters) in the API's protected environment. Missing configuration disables the routes (404). Ordinary browser cookies, ERP credentials and `diagnostics.read` tenant capability grants do **not** authorize this deployment-wide surface. Keep `/internal/` behind operator access/TLS or a loopback tunnel; never put this credential in the browser, public Vite configuration, URL or a consumer bundle. Rotation is replacement plus API restart; it grants no write operation. This is an operator decision, not a new company-role shortcut.

With a supported Node 24 runtime and the operator secret in the shell environment:

```powershell
npm run diagnostics
npm run diagnostics -- --json
npm run diagnostics -- trace TENANT_UUID SOURCE_UUID ACTION_UUID
```

`TAWSEL_DIAGNOSTICS_URL` defaults to `http://127.0.0.1:3001`. The terminal command samples process CPU twice over roughly one second and prints occupied/waiting pool connections, host memory and working-directory disk availability. It does not expose query text, connection strings, headers, exception messages, recipient names/phones or payload bodies.

| Surface | Meaning |
| --- | --- |
| `GET /health` | API liveness only; remains independent of database/Engine availability |
| `GET /internal/diagnostics/health` | Database readiness/size/active/blocked/deadlocks; recent worker loops; pending/failed/expired-lease counts and oldest ages; sender versus last reported receiver application; Engine availability explicitly unprobed; backup restore explicitly unverified |
| `GET /internal/diagnostics/metrics` | Last 1024 samples per HTTP/query/transaction/pool/COMMIT/Engine/export metric, lifetime counts/errors, pool, export retained count/bytes/expiry limits, process memory/CPU and host memory/disk |
| `GET /internal/diagnostics/actions/{actionId}?tenantId=...&sourceId=...` | Exact immutable action identity → recipient event/sequence → sender attempts/receipt → last receiver report/application watermark. At most 100 events with explicit truncation |

The schema and generated operator client are canonical: `contracts/diagnostics.schema.json`, OpenAPI and `DiagnosticsClient`. The two planned diagnostics operations now use the explicit **internal operator** boundary; tenant `diagnostics.read` remains reserved and never becomes deployment authority. ERP consumers continue using their existing source-scoped monitoring/outbox/checkpoint APIs.

## Interpret observations

Worker `recent-loop` means at least one process of that worker kind completed a loop within 120 seconds. It is not proof that every instance is alive or every item succeeded. Missing rows are `unknown`; an old row is `stale`. Inspect queue age, expired leases and persisted errors together. A worker stuck inside a job eventually becomes stale; idle loops continue to report. No stale status deletes or retries business evidence.

Query timing measures business callback queries in the shared transaction wrapper, including locks/network; transaction timing also includes pool wait and COMMIT. It is not PostgreSQL CPU time. Counters/rolling distributions are local to the current API process and reset on restart; worker-process distributions are separate. Diagnostic SQL uses a 1.5-second statement budget; core permission/query/readiness failure becomes `unavailable`, not zero pressure. Database size is an independent optional filesystem scan: its failure rolls back to a savepoint and returns `bytes: null` (CLI: size unavailable), retaining successful readiness and queue evidence. Host totals describe this OS; in a container they need corroboration with host/cgroup tooling. CPU is cumulative process microseconds until the CLI takes a delta. Disk describes the application working directory, not an independently mounted PostgreSQL or Engine volume.

Export gauges show live store records, ready/expired counts, retained bytes, per-store ready/file/record limits and TTL; they never reveal workbook contents. Phase 37 defaults remain 16 ready artifacts, 4 MiB each, 64 records and a 10-minute ready TTL. This is process-local storage, not durable or multi-instance export capacity.

`unapplied_or_unreported` includes unknown receiver reports. `oldest_report_ms` is age of the last report, **not** projection latency; compare an event's recipient sequence to `applied_through` and check report age. A receiver may have applied work without reporting it yet. Receipt, application and Tawsel acceptance remain separate facts. An idle driver can retain the same action/revision while successful conditional polling advances its refresh time.

## Follow one slow ERP action

1. Retain the action ID, tenant ID and source ID from the accepted command. For driver commands the source is the account, not the recipient integration. Structured HTTP logs contain these UUID correlation hints and a server-generated `X-Request-Id`; identities in logs are correlation hints, never authorization evidence.
2. Run the trace command. An accepted action remains committed even if the Engine is unavailable. Do not submit a new action ID to “repair” a slow projection.
3. For pending/failed/sending events, inspect attempts, `next_attempt_at`, lease expiry and sender queue age. Inspect the separately supervised outbox worker and callback connectivity. Use existing **source-scoped** delivery detail/retry APIs only after diagnosing the cause; diagnostics itself never retries.
4. Sender `received` only proves durable inbox acknowledgement. Compare each sequence with `applied_through`; a null or stale report calls for the receiver's authenticated `/api/v1/consumer/status?aggregateType=...&aggregateId=...`. The receiver credential stays with its operator. Check sequence/dependency gaps and the projection worker before replay/reconciliation; retain stable event IDs.
5. Capture outage lag at detection and recovery duration from restored service to confirmed application separately. The harness writes an actual outage trace with attempts, event IDs and received/applied evidence, plus during-fault queue ages.

| Symptom | Next useful check |
| --- | --- |
| API alive, database unavailable | PostgreSQL reachability, role/migrations, pool acquisition and statement deadline; retry unknown command results with the same ID |
| Waiting pool and long transaction/query tail | Observe blocked sessions with operator DB tools; identify long lock holders. SQL text is deliberately absent from the public diagnostic response |
| Old pending jobs, stale worker | Supervisor/process logs, lease expiry and persisted failure; do not infer Engine readiness from liveness |
| High Engine errors/unassigned work | `npm run engine:live` probes configured private profiles; inspect versions/datasets without importing maps or restarting Engine |
| Sender age grows, receiver reports absent | Separate delivery failure from unavailable/stale application reports; follow the trace above |
| HTTP healthy, visible view slow | Browser visibility/throttling, polling period, render/map work, observer count and network; compare actual browser timings |
| RSS/disk grows | Compare export bytes/count/expiry, PostgreSQL growth and host metrics over the same interval; do not assume Node heap is all host memory |
| Backup says unverified | Inspect backup/WAL storage and prove an isolated checkpoint restore in Phase 40; a job exit alone is insufficient |

## Reproduce local load without touching application/Engine data

```powershell
npm run db:local:start
npm run build:foundation
npm run test:diagnostics
npm run performance:load -- smoke
npm run performance:load -- baseline
npm run performance:load -- ramp
npm run performance:load -- stress
```

The harness requires the marked loopback `tawsel_test_control` database and uses random owned disposable Tawsel/receiver databases. Every receiver has a separate restricted role. Cleanup closes pools and drops only databases created by that invocation; no Engine dataset/mount/import or application database is touched. Fixed web port 5188 must be free. Install the pinned Playwright Chromium binary if absent. Existing local map assets are served by the actual map route; missing assets remain HTTP errors, never stubs. Run these profiles sequentially with no competing test/build load for interpretable comparisons.

Profiles start with five drivers/two single-driver browser observers and ramp to ten/five and fifteen/ten. Active views are explicit; ERP application is measured for every action, visible rendering only for subscribed drivers. Actions alternate headings between two tasks per driver through actual current-activity HTTP/CSRF/domain transactions. Identity authentication and source seeding are labelled fixtures. Setup/warmup is outside the measured interval; seeded UUIDs differ while the workload schedule is repeatable. Waves wait for their completions, so this is a bounded closed-loop workload, not an open-loop throughput capacity ceiling.

Every profile also injects a receiver HTTP outage, a frozen Chromium page through CDP and a dispatch hold labelled unsent time. The dispatch hold is not a new phone-storage test. Stress additionally occupies ten independent application-pool connections for six seconds to reproduce pool exhaustion; this condition is excluded from healthy percentiles and its failed actions remain in the report. Reports include raw samples, errors, worker failures, route status counts, separate recovery durations, resources, clock probes and an action trace under `.local/performance/`.

Use nearest-rank percentiles `sorted[ceil(p*N)-1]`; include counts and failure/timeout counts. The harness requires at least 100 eligible successful observations for a run-level target comparison, not as a statistical confidence guarantee. It measures a conservative actual Tawsel COMMIT interval, post-COMMIT receiver application, and matching React DOM plus two animation frames. Browser clock offset/uncertainty uses seven same-host round trips and an end probe; remote NTP accuracy and physical screen latency are not asserted. Never mix old benchmark results into a new measurement or turn a fast individual sample into a p95 pass.

## Phase 39 handoff

Phase 39 may rely on migration 0028, the optional operator endpoints/client, safe correlation/timing, worker-loop evidence, this terminal workflow, the isolated harness and the retained local report. It must inventory the actual target, supervisor, resource/cgroup limits, other workloads, Engine versions/datasets, private routing network, TLS and separate backup storage. Repeat only measurements affected by that actual configuration. Local results establish no Hostinger/Dokploy capacity, account cap, purchase requirement, physical-device acceptance or backup readiness. Phase 39 is not executed here.
