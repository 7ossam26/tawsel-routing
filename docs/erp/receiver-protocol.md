# External mock receiver protocol — Phase 26

The reference consumer is `apps/mock-erp` version 0.1.0. Its only Tawsel dependency is the public client/schema package. It owns a separately marked PostgreSQL database and a separate nonsuperuser role; no Tawsel database credentials or internal modules are installed in the standalone bundle. Database ownership permits its own migrations, not reads of Tawsel tables. This is a reference execution projection, not commercial accounting, stock valuation or settlement.

## Receipt and application

POST the exact signed bytes to the configured consumer callback, normally `/api/v1/consumer/events`. P25 headers, HMAC input, key overlap and five-minute timestamp window remain unchanged. The receiver validates the closed sender-event schema, supported versions, nested tenant/source identities, aggregate identity and correlation before writing. Body limit is 1 MiB; UTF-8 decoding is strict. All current supported sender events are required transitions. The designed `progress.snapshot` webhook is not emitted/accepted; replacement recovery uses the HTTP checkpoint below.

Receipt transaction: lock recipient scope, enforce unique event ID and aggregate sequence, insert envelope/raw bytes/hash with synchronous commit, then return the canonical `acknowledgement=received` body. Same-ID/same-wire redelivery returns the prior durable receipt. Different authenticated bytes or payload and sequence-ID collisions return 409 and retain a mismatch audit; invalid signatures/scope/schema do not enter the inbox. A lost response is retried with the same ID/body and fresh signature. HTTP receipt never asserts application.

Replay is authenticated public HTTP data. Its semantic canonical hash must match an existing event; an initial replay receipt has no invented wire signature. The first later webhook binds its actual raw bytes. Once raw bytes exist, byte changes are rejected even if the JSON means the same thing.

The independent worker commits projection, append-only transition history and the inbox applied marker together. A scope-row lock serializes the small reference consumer, including independent workers. No network call holds this lock. Failures roll back quantities/collection and the marker; safe error codes remain visible. Actual task/assignment snapshots, per-attempt effective outcomes, corrections and return request/item quantities are projected. Other supported notices retain their latest scoped fact per type/resource. Original outcomes remain in transition history; correction replaces the effective outcome for that attempt. Reported collection is a report, never remittance. Cross-stream return requests wait for a known outcome and can recover that task through public replay.

## Public status and recovery

| Interface | Location and meaning |
| --- | --- |
| `consumer.receiveSignedEvent` | Consumer POST `/api/v1/consumer/events`; durable receipt only |
| `consumer.getStatus` | Consumer GET `/api/v1/consumer/status?aggregateType=task&aggregateId=<UUID>` with consumer-owned bearer status token |
| `integration.replayEvents` | Tawsel GET `/api/v1/integration/replay`; source-scoped pages of 1–100 consecutive events |
| `integration.getReconciliationSnapshot` | Tawsel GET `/api/v1/integration/reconciliation?aggregateType=task&aggregateId=<UUID>` |
| `integration.reportAppliedCheckpoint` | Tawsel POST `/api/v1/integration/commands/integration.reportAppliedCheckpoint`; canonical action envelope, payload `ConsumerCheckpoint` |
| `integration.getAppliedCheckpoint` | Tawsel GET `/api/v1/integration/applied-checkpoint?aggregateType=task&aggregateId=<UUID>` |

Tawsel recovery/report interfaces use an expiring source-scoped service credential with `integration.manage`. They reject foreign aggregates before disclosure. Report commands retain their identity/body in the receiver database across response loss. Revision reuse with changed content and regressing watermarks are rejected. Reports explicitly say `evidence=receiver-reported`; they are authenticated consumer assertions, not Tawsel auditing another database. Queue `projectionStatus=unknown` continues to describe transport alone; read the separate applied report. No recursive `integration.applicationReported` webhook is emitted; that notification remains designed.

`receivedThrough` and `appliedThrough` are contiguous sequences from 1; `receivedHigh` is the maximum durably received sequence. `projectedThrough` is current-state coverage, and `snapshotThrough` records adopted replacement coverage. `historyComplete=false` means a snapshot covers transitions that have not all been processed locally. A normal pending gap has `lastError=sequence_gap`; projection errors and missing cross-stream dependencies are distinct. Timestamps record actual local receipt/application, not an asserted freshness SLO. Status reads are coherent, authenticated and `no-store`.

Out-of-order events are durably buffered/acknowledged, not applied ahead of a gap. Replay begins after the contiguous received watermark. A bounded recovery call accepts at most ten pages of 100 events and applies at most 1000 local events; the worker resumes on its next pass. It scans up to 100 streams and 50 missing task dependencies per pass, at one-second idle cadence. A direct CLI reconciliation also discovers a known stream with no locally received events. No account-wide unbounded stream-discovery API is promised.

## Retained history and checkpoints

The production/default sender policy remains **indefinite retention, no automatic purge**. Immutable sender rows cannot normally be deleted. Replay returns 410 `replay_expired` only when an actual hole exists below the known stream head; it does not manufacture a retention window. Authenticated recovery checkpoints materialize the current published projection from a retained prior checkpoint plus consecutive committed events. They are scoped to one recipient aggregate, not a live mixed-source trip or whole ERP inventory snapshot.

A checkpoint read handles at most 10,000 new events, with at most 1000 effective attempts, return items or notice keys in each current projection. Unsupported events, excessive bounds or uncovered missing authoritative history return 503; the consumer retains its prior state. No automatic purge policy, archival system or periodic sender snapshot scheduler is added. If a future retention policy is introduced, it must preserve validated current checkpoints before removing any history. A cached checkpoint can restore current state beyond unavailable replay; without one, recovery fails explicitly.

Adoption atomically replaces current state only if its sequence is newer. It creates no inbox rows or historical financial/receipt transitions. Missing history remains visible, even if current quantities are usable. Late required events at or below snapshot coverage still create their own once-only transition history and processed marker; their quantities are not added again to the already covered current state. Only receiving/applying every preceding event closes the historical gap. An older replacement snapshot cannot regress state. Reconciliation never invents a receipt, cash movement, settlement or lost historical correction.

The retention-loss test disables immutable-row triggers **inside a transaction in a disposable test database** to inject unavailable history after caching a valid checkpoint. That is failure injection, not an available purge feature or proof of an approved archival policy. Ordinary retention protection remains intact.

Canonical ownership: `contracts/consumer.schema.json`, existing feature event definitions, `contracts/events/sender-event.v1.schema.json`, OpenAPI and generated public types. See [quickstart](consumer-quickstart.md) and [executed evidence](../verification/integration.md).
