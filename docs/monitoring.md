# Coherent monitoring and scoped history — Phase 24

Implemented locally, 24 September 2026. Ordered PostgreSQL/API evidence is recorded separately in [the phase record](phase-24-evidence.md).

Browser reads use the existing personal/company session and either `monitor.read` in assigned branches or `execution.own` for the assigned driver. ERP reads authenticate the existing service credential with `monitor.read`. Every task, cycle, outcome, action and aggregate is filtered by tenant, branch, driver and integration before projection. A branch filter narrows access; it never grants it. Missing and hidden direct IDs have the same 404. Prepared work is visible upcoming work, never possession.

Driver and trip snapshots share a contract. Driver reads select the latest authorized workday/round; trip reads select the exact historical round. Counts cover unique authorized shipments admitted to the selected round; before any round they cover current received work. Each shipment is classified by its latest admitted attempt and effective corrected outcome. `processedShipments = fullDeliveredShipments + partialShipments + failedShipments`; `shipments = processedShipments + remainingShipments`. Failure includes refusal and no-answer. Retries add attempts, not shipments. `processedAttempts` includes previous attempts once each, never correction versions. Held/prepared groups describe current custody/assignment independently of that historical denominator; return-required pieces are part of held, not an extra additive bucket. No collection settlement is implied.

All authorization and related reads use one PostgreSQL repeatable-read transaction. Reads do not allocate attempts, run planning or use worker `SKIP LOCKED`. A durable per-view revision ledger stores the hash of the authorized meaning, with an increasing replacement revision. Concurrent readers that race on that ledger retry their entire transaction on serialization failure. This prevents an older database snapshot from overwriting a newer ledger entry. Revisions are observed replacement versions, not counts of business events. They are comparable only within `scopeKey`, which includes principal, effective access, resource and filters. Hidden changes do not advance a source viewer's revision.

`ETag` is scoped to that meaning. `If-None-Match` supports lists, weak validators and `*`; a successful unchanged read returns 304 with `X-Snapshot-Revision`, `X-Snapshot-Scope` and `X-Refreshed-At`. Full reads return identical authorized meaning plus fresh read timing. Clients retain their body on 304; compare revisions only under the same scope key. Scope/filter changes require replacing the old body. Full reconnect reads omit the conditional header. Phase 32 owns polling, reconnect, timeout and display behavior.

Lists have a bounded 1–100 page size, default 50. Opaque cursors bind the scope, authorized content hash and offset. If authorized meaning changes between pages, return 409 `snapshot_changed`; restart with no cursor. Counts always cover the complete authorized denominator, not just one page. Cursor and ETag never encode hidden totals or global revisions.

Current and next expose only authorized task details. Hidden or absent details are both null; no hidden count or hidden-stage flag is returned. Shared plan IDs, full-route revision/forecast/workload and owner device IDs are private to a complete own-driver view; scoped viewers receive visible order and the scoped snapshot revision. No full mixed-source plan payload is returned. Branch service exposes only its authorized source branch and stage, without another source's retained sequence or handover list.

Task history preserves cycles, attempts, original outcome versions and correction links. Old holders retain source-revision-bound pins/actions; later-cycle holder activity cannot change their history. Historical-only views use their authorized accepted-action timestamp rather than the current task write mark. Workday history uses explicit workday/round identity across midnight. Action history is a sanitized server-received record, scoped through persisted domain relationships or validated admission references; arbitrary IDs inside rejected envelopes never grant visibility. No raw batch result, audit details or rejected payload is disclosed to an integration.

Successful-refresh time is server response preparation time, not proof the client rendered it or the driver's phone is online. Last action receipt, accepted change recording and unknown device contact are separate. Change instrumentation records a transaction correlation and database write time, visible only after commit; it is **not** the exact WAL commit instant. For scoped viewers the change mark is the newest available authorized task mark or accepted action; shared driver/plan marks are withheld. A visible plan-only replacement can therefore advance snapshotRevision while that mark stays unchanged. Treat the revision and successful refresh as authoritative for the replacement, never the mark as an exact freshness watermark. Phase 38 must account for commit/response/render intervals. The catalog’s `progress.snapshot` push event remains designed; these verified replacements are HTTP reads. Delivery/application transport is unavailable until its actual persistence is implemented by Phases 25–27. Unsent local phone work is absent from server knowledge.

## API and reproducible demonstration

| Browser route (`?kind=personal` or `company`) | Meaning |
| --- | --- |
| `GET /api/v1/monitoring/drivers/{id}` | Latest authorized round/day and current holder groups; current task list plus retained old-cycle held discrepancies |
| `GET /api/v1/monitoring/trips/{id}` | Exact authorized round and its admitted task/attempt list; current custody groups are labelled separately |
| `GET /api/v1/monitoring/tasks/{id}/history` | Scoped cycle/attempt/original/effective outcome/correction/action history |
| `GET /api/v1/monitoring/workdays/{id}/history` | Scoped rounds and task history, unique shipment and attempt counters |
| `GET /api/v1/monitoring/actions/{id}?sourceId={sourceId}` | Sanitized received action metadata; no raw mixed-source payload/result |

ERP consumers use the same paths under `/api/v1/erp/monitoring`, without `kind`, authenticated with the existing `Bearer twp_...` credential. The operator's versioned `integration.bindSource` command accepts `monitoringCapabilities:["monitor.read"]`; omission preserves and `[]` revokes only that grant. A source cannot self-grant it. Branch grants still apply. Supported filters are the resource ID and optional `branchId`; pagination adds `limit` and `cursor`. History is grouped deterministically as rounds, cycles, admissions, original outcome versions, corrections and sanitized actions, with deterministic order within each group. Correction and receipt updates may change history; stale cursors require restart.

All body schemas live in [monitoring.schema.json](../contracts/monitoring.schema.json), operations in [the catalog](../contracts/operations.json), and public HTTP semantics in [OpenAPI](../contracts/openapi.yaml). [MonitoringClient](../packages/api-client/src/monitoring.ts) preserves 304 responses without trying to parse a body. It deliberately does not poll or apply results to a UI.

The current implementation reconstructs the authorized resource set to hash its meaning before slicing response pages. Page size bounds the response, not the total reconstruction cost. SQL uses scoped indexes; large historical datasets and view-ledger growth have not been load-tested. Phase 38 must measure these costs before claiming capacity or a freshness SLO.

```powershell
npm run db:local:start
npm run db:migrate
npm run test:monitoring -- --maxWorkers=1
npm run monitoring:demo
npm run test:erp:monitoring -- .local/phase-24-demo.json
```

Tests/demo create and remove their own marked isolated PostgreSQL databases; no Engine/map imports are needed. The demo starts ephemeral loopback HTTP servers and writes `.local/phase-24-demo.json` without credentials. It shows A's 2 shipments, B's 1 and the driver's 3; a partial → full correction retains both outcomes while processed attempts remain 1. It proves conditional/full equivalence and hidden history denial. Identity and cross-source driver-reference setup are labelled fixtures, not external issuer/ERP interoperability proof. No UI component changed, so there is no new browser/render/interaction evidence.

## Exact Phase 25 handoff

Phase 25 may rely on migration **0023**, `monitoring/{routes,service,queries,models}.ts`, canonical schemas/examples/operations, the public MonitoringClient, real snapshot/isolation tests and the loopback demonstration. It may also use the existing immutable source-specific outbox intents and P23 corrected outcomes. It must add its own real sender persistence/transport tests. `integrationDelivery:'unavailable'` must not be relabelled delivered/applied without that evidence. P32 owns one-in-flight polling, stale display, scope-aware nonregression and reconnect full resync; P38 owns measured freshness/load evidence. This phase supplies timing support, not a freshness SLO result.
