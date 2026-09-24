# Durable signed delivery — Phase 25

P26 update: the separate [durable receiver and applied/reconciliation protocol](erp/receiver-protocol.md) is now locally verified. P25 byte signatures and receipt acknowledgement remain unchanged. Three additional Tawsel operations provide scoped current checkpoints and separate receiver reports; the ordinary delivery queue still describes transport alone. Retention remains indefinite/no automatic purge; a real missing retained sequence now returns 410 with explicit reconciliation limits. Historical P25 statements below about future receiver work are superseded by this update.

Implemented locally on 24 September 2026. [Ordered evidence](phase-25-evidence.md), [canonical operations](contract-coverage.md), [sender event catalog](../contracts/events/sender-event.v1.schema.json), [operational schemas](../contracts/outbox.schema.json), [public client](../packages/api-client/src/outbox.ts), [portable signature verifier](../packages/api-client/src/webhook-signature.ts). This phase transports committed intent. Phase 26 owns the external durable inbox, atomic projection and separate applied checkpoint.

## Reproduce

Use Node 24 LTS (`24.19.0` exercised), npm 11 and the pinned lockfile. The dedicated local PostgreSQL cluster must be running. No Engine import or issuer/ERP deployment is needed for these controlled checks.

```powershell
npm run db:local:start
npm run test:outbox
npm run outbox:demo
npm run test:erp:outbox -- .local/phase-25-demo.json
```

The demo creates and removes its own marked PostgreSQL database. Actual source provisioning/intake, received assignments, round start, outcomes, driver correction, return request and actual subset receipt commit before configuring the sender. A real loopback HTTP receiver loses its first response. The public client retries the retained event, then observes 19 unique received events and one duplicate transmission. The controlled receiver stores captures in process memory: **this is sender proof, not a durable ERP inbox or applied projection**. Issuer enablement is a labelled fixture. The capture contains a disposable fixture signing key, public event bytes and headers, never a database/operator credential. Keep captures private because payloads can contain contact data.

The consumer checker imports only the public verifier/types. It can be copied with `packages/api-client/src/{webhook-signature.ts,schema.d.ts}` and the capture into the same relative layout outside this repository and run with Node/tsx; it requires no Tawsel database access. It verifies captured timestamps at their recorded send time for reproducibility. A live receiver must verify against its current clock.

## Worker and setup

Deploy migration `0024_outbox_delivery.sql` before updated API and worker processes. It serializes sequence allocation and backfills already committed integration intents in one migration transaction. Account notifications remain outside this sender. On a large existing queue, schedule the migration because it locks/backfills the outbox; pilot performance at production volume has not been measured.

An operator provisions an external JSON file readable only by the API/worker service accounts and sets `TAWSEL_OUTBOX_CONFIG_FILE` to its absolute path. Generate a separate random 32-byte hex encryption key and random 32-byte hex secret for every source/key ID; securely share each signing secret with only its intended receiver. Example **shape**, with placeholders that deliberately fail validation:

```json
{
  "encryptionKey": "REPLACE_WITH_64_LOWERCASE_HEX_CHARACTERS",
  "testLoopback": false,
  "destinations": [
    {"tenantId":"TENANT_UUID","integrationId":"INTEGRATION_UUID","url":"https://receiver.example.com/tawsel/events"}
  ],
  "keys": [
    {"tenantId":"TENANT_UUID","integrationId":"INTEGRATION_UUID","keyId":"erp_2026_09","secret":"REPLACE_WITH_A_DIFFERENT_RANDOM_64_HEX_SECRET"}
  ]
}
```

This file is separate from command bearer credentials and the identity encryption key. Back it up in protected secret storage; loss of its encryption key prevents decrypting persisted signing keys. Public commands select preprovisioned key IDs; raw secrets never enter command envelopes, results, evidence, logs or GET responses. Database secrets use AES-256-GCM and contain their tenant/integration/key binding, which is checked after decryption. Key IDs are permanently reserved and cannot be reused with changed material.

The source uses its expiring P08 bearer credential with `integration.manage`. Its tenant/integration is bound by authentication; body scope must match, and asserted human actors are rejected. Operator allowlists bind **exact normalized URLs to one tenant/integration**, so a consumer cannot choose another source's endpoint or an arbitrary address. Configure `integration.configureWebhook`, then activate the provisioned key with `integration.rotateSigningKey`. API reads work without an operator config; commands return 503 until it is supplied. Existing unconfigured outbox entries remain visible as pending.

```powershell
npm run db:migrate
npm run outbox:worker:once
npm run outbox:worker
```

Run the worker separately under process supervision. Default concurrency is 4, lease 30 seconds, total DNS/HTTP deadline 5 seconds, idle poll 1 second. Internally concurrency is bounded to 1–16 and at most one active send per integration across workers. SIGINT/SIGTERM abort in-flight HTTP and drain database work; abrupt death leaves recoverable leases. `--once` processes one bounded batch. A database error exits with a sanitized error; the supervisor should restart it. No secret/public target is installed by the demonstration.

Destinations require HTTPS/443, no URL credentials/query/fragment, and only public unicast addresses. DNS is resolved afresh for each attempt, all returned addresses are checked, and the connection pins a checked IP while TLS validates the original hostname. IPv4 private/shared/link-local/reserved/multicast and IPv6 local/mapped/documentation/transition ranges are rejected. Redirects are not followed; ambient proxy settings, cookies and pooled sockets are not used. `testLoopback:true` permits only an explicitly allowlisted `http://127.0.0.1:<port>/...` target and is rejected with `NODE_ENV=production`. Both API and worker enforce policy; deployment still needs normal egress controls and certificate configuration. An already claimed send can finish against its captured endpoint/key after a configuration change; use overlap and receiver deduplication for in-flight requests.

## Exact signing protocol v1

POST one uncompressed UTF-8 JSON envelope, `Content-Type: application/json`, maximum body 2 MiB. The first claim persists the serialized bytes; retries and controlled redelivery reuse them unchanged. Header names are case insensitive; header values below are exact. Duplicate or ambiguous signature headers must be rejected by a receiver.

| Header | Value |
| --- | --- |
| `X-Tawsel-Tenant-Id` | Bound lowercase tenant UUID |
| `X-Tawsel-Integration-Id` | Bound recipient integration UUID |
| `X-Tawsel-Key-Id` | 1–64 ASCII letters/digits/underscore/hyphen |
| `X-Tawsel-Delivery-Timestamp` | 13 decimal digits, Unix milliseconds at this claim |
| `X-Tawsel-Signature` | `v1=` followed by 64 lowercase hexadecimal HMAC-SHA256 digits |

HMAC input is the concatenation of this UTF-8 prefix and the **unmodified raw body bytes**. Every shown line ends with LF (`0a`), including the timestamp line; there is no separator or newline after the body unless it was already in the signed bytes:

```text
tawsel-webhook-v1
<tenant UUID>
<recipient integration UUID>
<key ID>
<delivery timestamp>
```

Decode the 64-character secret as 32 bytes before HMAC. Do not sign a parsed/re-serialized JSON object or a body digest string. Preserve UTF-8 Arabic bytes. The [published vector](../contracts/examples/webhook-signature.v1.json) contains an explicitly public test key, exact base64 body, prefix, timestamp and expected signature; `outbox-protocol.test.ts` verifies it against the public consumer implementation and rejects whitespace/timestamp/key changes. The live sender and consumer implement the published protocol independently.

Accept timestamps only within ±300,000 ms of the receiver clock and compare fixed-length signatures in constant time. Synchronize clocks. Validate expected tenant/integration, key ID and supported envelope/payload schema before durable receipt. Deduplicate by `(tenant,recipient integration,eventId)` even when a new delivery timestamp/signature is valid: a fresh signature authenticates retransmission, not a new business fact. The helper authenticates raw bytes; the caller must also validate the canonical event schema and nested recipient ownership.

Rotation sequence: provision/share the new scoped secret, ensure the receiver accepts its key ID, then submit a stable action for `integration.rotateSigningKey`. Future claims use the new key. Retain the previous verifier until the returned `verifyUntil`; allowed overlap is 300–86,400 seconds, inclusive. The old key may validate in-flight deliveries during overlap, subject to the normal clock window; after overlap it must be refused even if its timestamp is fresh. Retried old events use the current key. Keep returned activation/retirement metadata in the receiver configuration. Emergency secret replacement uses a new key ID and receiver revocation policy; this phase does not automate external secret distribution.

## Envelope, catalog and ordering

`schemaVersion` and `payloadVersion` are independently fixed to `1.0.0` in the released local reader. Unsupported types/versions become retained `failed` deliveries; they are never silently skipped or downgraded. No negotiation/upcaster or production release is claimed. [Canonical sender catalog](../contracts/events/sender-event.v1.schema.json) points to feature-owned payloads; it does not copy their definitions.

| Emitted event family | Payload owner | Aggregate stream |
| --- | --- | --- |
| `provisioning.changed` | provisioning `ProvisioningChanged` | integration / recipient ID |
| `task.snapshotAccepted`, `task.urgencyChanged`, `assignment.prepared/received/withdrawn/reassigned`, `dispatch.createdFromReceipt` | intake `ChangedEvent` | task / task ID |
| `location.pinConfirmed` | location `ConfirmedEvent` | task / task ID |
| `plan.revisionPublished` | planning `PublishedEvent` | integration / recipient ID |
| `round.started/ended`, `branch.roundInterrupted/arrivalRecorded/roundResumed` | round/closure/branch feature event | trip / round ID |
| `workday.ended` | closure `Event` | workday / workday ID |
| `current.headingSelected/arrivalRecorded`, `outcome.recorded/corrected`, `task.deferred/retryAdmitted/deferredActivated/driverUrgencyChanged` | current/outcome/correction/eligibility feature event | task / task ID |
| `return.requested/subsetReceived/dispositionRecorded` | returns feature events | return-request / request ID |

The stream key is `(tenant, recipient integration, aggregate type, aggregate ID)`. Sequence starts at 1 **after source visibility filtering**. Allocation takes a transactional stream-row lock; rollback consumes no sequence, and another transaction cannot commit a higher sequence first. Migration backfill orders historical committed intent by `(created_at,event_id)` within that scope; it cannot reconstruct an unavailable exact historical WAL commit instant. No account notification enters an ERP sequence. The sender never loads a current mixed-source resource to enrich an old event.

`eventId`, body, action correlation, payload and aggregate sequence survive restart/retry. `resources` includes only IDs in the source-filtered committed fact; `versions` exposes available source/outcome/location revisions. Other relevant assignment/route/activity revisions retain their feature-defined payload names. A domain revision is **not** a transport sequence and must never drive gap detection. `committedAt` is the retained event insertion time from the committing transaction, visible only after commit; it is not client observation time, signature time or exact WAL commit time. Precise commit-to-projection freshness benchmarks remain P38.

Only the earliest unreceived event of an aggregate is eligible. A failed head blocks its own successors while other aggregates/integrations can proceed. After receipt, delayed duplicate requests may arrive out of order; receivers still deduplicate and buffer gaps. There is no cross-aggregate total order: validate dependencies and use scoped reads/replay when one stream depends on another. All current outbound entries are mandatory transitions/notices. `progress.snapshot` replacement-event transport remains designed; P24 conditional HTTP snapshots are available separately. A later snapshot does not erase outcome/receipt/correction history.

## Receipt, failures and public operations

A successful 2xx response must carry the closed acknowledgement body below, at most 8 KiB; wrong IDs, empty 204, malformed JSON, redirects and extra `applied` claims fail acknowledgement validation:

```json
{"schemaVersion":"1.0.0","tenantId":"TENANT_UUID","recipientIntegrationId":"INTEGRATION_UUID","eventId":"EVENT_UUID","acknowledgement":"received"}
```

A real receiver must durably store verified event identity/payload before replying. Tawsel can record only that authenticated endpoint's **reported receipt**, not independently certify its storage. `projectionStatus` remains `unknown`, even after 2xx. Original intent stays pending to protect unresolved application history. P26 will implement separate applied checkpoint/error evidence. No inventory, actual branch stock or settlement is inferred from transport receipt.

| State | Observable meaning |
| --- | --- |
| `pending` | Committed intent is waiting for configuration, its due turn or controlled replay |
| `sending` | Attempt and lease committed; network work runs outside all database transactions |
| `failed` | Safe failure code retained; automatic retry scheduled |
| `received` | Matching closed receipt acknowledged; projection still unknown |
| Attempt `lease-expired` | A dead/stalled attempt was superseded; old completion cannot overwrite the new lease |

Retry delay for attempt n is uniform from half to all of `min(300000,1000*2^(n-1))` milliseconds. No attempt limit deletes or silently dead-letters events. The queue exposes `blockedBy`, counts, oldest unreceived time, next attempt, lease expiry, receipt time, safe errors and retained attempts. Missing keys, unsupported payloads, timeout and HTTP failures remain discoverable. Correct configuration/version issues before controlled retry; unresolved failures remain retained indefinitely.

| Operation | HTTP interface |
| --- | --- |
| `integration.configureWebhook` | POST `/api/v1/integration/commands/integration.configureWebhook`; action payload `{url,enabled,expectedRevision}`, zero for first configuration |
| `integration.rotateSigningKey` | POST `/api/v1/integration/commands/integration.rotateSigningKey`; action payload `{keyId,overlapSeconds}` |
| `integration.retryDelivery` | POST `/api/v1/integration/commands/integration.retryDelivery`; action payload `{eventId}` |
| `integration.getDeliveryStatus` | GET `/api/v1/integration/deliveries?limit=50&cursor=<eventId>` |
| `integration.getDeliveryDetail` | GET `/api/v1/integration/deliveries/<eventId>?limit=50&beforeAttempt=<number>` |
| `integration.replayEvents` | GET `/api/v1/integration/replay?aggregateType=task&aggregateId=<UUID>&afterSequence=0&limit=50` |

Commands use canonical action envelopes with empty resources/base versions/dependencies and integration context; retain the same action ID/body after an unknown response. Duplicate retry does not reschedule twice. New explicit retry actions may redeliver already received events, retaining bytes and first receipt time. An active lease rejects retry with 409; stale endpoint revisions also reject with 409. Read/auth errors use the canonical Problem body and do not disclose foreign IDs, counts or endpoint secrets. Disabling a source prevents new claims and reads; in-flight requests remain possible.

Pagination defaults to 50, maximum 100. Queue cursor is exclusive event UUID order for a live queue: restart from the first page to discover newer insertions before a cursor. Counts and items are read coherently. Attempt history descends by attempt number. Replay ascends within one aggregate and does not alter delivery state; `nextAfterSequence` is exclusive. JSON replay returns the same envelope; original wire bytes can be re-sent through controlled retry. Consumers deduplicate replay by event ID and must not verify an old wire signature against a re-serialized replay response. Replay is authenticated HTTPS data, not an unsigned webhook.

Retention is **indefinite with no automatic purge**, including received-but-unprocessed, failed, identity, payload, byte and attempt records. No replay expiry exists in P25, so `410 replay_expired` is not fabricated. Beyond-window reconciliation/applied checkpoints remain P26 obligations if a future approved retention policy introduces expiry; a current-state snapshot must never invent missing historical financial transitions. Monitor table/disk growth and keep audit gaps explicit.

## Handoff to Phase 26

Rely on migration 0024, six scoped operational endpoints, 27 canonical integration event payload mappings, the exact signing vector/verifier, encrypted key rotation metadata, stable retained bytes/IDs, ordered lease-fenced sender, real PostgreSQL/HTTP/process tests and public consumer demo. Implement separate receiver storage, durable acknowledgement, transactional deduplication/projection, applied/error checkpoints, cross-stream dependency/gap handling, reconciliation and receiver crash/replay proof. Do not reuse the memory receiver as a durable inbox. Production HTTPS/TLS, native ERP compatibility, load/freshness SLOs, owner/device review and deployment remain unverified.

Implementation references checked against primary documentation: [Node HTTP](https://nodejs.org/docs/latest-v24.x/api/http.html), [Node crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html), [PostgreSQL locking](https://www.postgresql.org/docs/18/sql-select.html), [OWASP destination controls](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html). Existing dependency pins are retained.
