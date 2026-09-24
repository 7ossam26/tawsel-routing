# Online device takeover and former-phone evidence

Phase 20, locally verified 24 September 2026. [Ordered evidence](phase-20-evidence.md), [canonical schema](../contracts/device-ownership.schema.json), [OpenAPI](../contracts/openapi.yaml), [typed client](../packages/api-client/src/devices.ts).

Run `npm run devices:demo`, then `npm run test:erp:devices -- .local/phase-20-demo.json`. The demo uses two separate real application sessions, a signed OIDC issuer fixture, real loopback HTTP and a disposable PostgreSQL database. It creates a task/manual plan/round, opens the same running round on another phone identity, deliberately loses the committed takeover response, restarts the API, retries the original action, downloads the current heading, records new-owner arrival/outcome and receives old evidence. It asserts one round, one takeover and one authoritative outcome. It does not use a live Engine, browser, physical phones, production identity provider or ERP receiver.

`npm run test:devices` covers independent PostgreSQL connections, observed lock blocking, rollback faults, every existing execution family and recovery constraints. Existing prior migrations/data are preserved; apply additive migrations 0017–0018 with `npm run db:migrate`.

## Public sequence

All paths require a current personal/company session (`?kind=personal|company`). POSTs require same-origin CSRF. Tenant/account/driver come from verified session identity and live authorization, never contact details. Device UUID is a stable logical installation identifier, not hardware attestation or an account credential. Persist it per account/installation; reauthentication does not invent another action ID or generation.

| Operation | Path / behavior |
| --- | --- |
| `device.getContext` | GET `/api/v1/devices/rounds/{roundId}?kind=…&deviceId=…`: same-driver owner/view state, open/closed states and takeover availability; no token. |
| `device.takeOver` | POST `/api/v1/devices/takeover`: original command envelope, `{roundId, expectedGeneration}`. Only a different installation of the same authorized driver may take over an active round/open day. No original-phone approval. |
| `device.getSnapshot` | GET `/api/v1/devices/rounds/{roundId}/snapshot?kind=…&deviceId=…`: latest current/physical origin/eligible targets and ownership in one locked read. The matching owner receives `snapshotToken`; viewers receive null. |
| `action.getResult` | GET `/api/v1/actions/{actionId}?kind=…`: scoped execution/takeover result, or 202/pending for an unknown ID. Other command families retain their feature result APIs. |
| `evidence.receiveFormerDevice` | POST `/api/v1/evidence/former-device`: the **original** supported execution envelope and action ID; no wrapper ID. This endpoint never executes business state. HTTP 200 acknowledges durable receipt even when business status is review/rejected. |
| `sync.getEvidenceReceipt` | GET `/api/v1/evidence/{actionId}?kind=…&deviceId=…`: original retained envelope when present, original result, durable receipt and current recovery constraints. Unknown/hidden evidence is unavailable. |

The takeover transaction compares expected generation, increments once and retains an immutable transition/result. Two distinct takeovers based on the same generation cannot both win. Exact retries return the original result even if a later takeover has superseded it; changed payload with the same ID conflicts. Clients must check a fresh snapshot rather than infer current ownership from a historical successful response.

`DevicesClient.continueOnThisPhone` awaits takeover and snapshot, and returns no enabled snapshot if ownership changed or the round ended. Put the returned generation and token into **new** action envelopes only after saving the confirmed snapshot. No token is returned by takeover or result lookup. A failed download leaves controls disabled. The server rejects a takeover-generation command lacking the token with durable `sync_required`; do not mutate and reuse that rejected envelope. Full local persistence is P33–35.

Fences run under the same driver guard as takeover, before current/origin, outcome, deferral/activation/retry/urgency, round/day close and active planning/pin mutations. Existing P15 start-generation envelopes remain compatible; start already returns its confirmed round. Preparation actions before an active round keep their prior authority. P19 preparation on the latest ended anchor is retained and does not reopen a day.

## Evidence and recovery

`receipt.evidenceStatus=received` means committed server retention. `receipt.businessStatus=accepted|rejected|review-required` is separate. `submissionStatus=duplicate` only describes repeated delivery and returns the original unchanged business result/receipt; it is not a new acceptance. An already accepted old command returns its earlier accepted result without reapplying it. Missing HTTP responses and 202/pending are not evidence receipts.

Stale commands received through execution endpoints and original envelopes received through evidence-only ingress share one account-scoped identity/hash. They preserve observation, sequence/dependencies, resource/base revisions and payload. Device time does not decide authority. Unknown/nonformer generations at evidence-only ingress are rejected evidence. Malformed, unauthenticated or unauthorized submissions receive no durable acknowledgement: their local evidence must remain pending.

Recovery metadata rechecks the original workday, original dispatch-cycle dependencies, source/assignment/attempt state, current logical owner and correction capability. `closed-workday` and `dependent-receipt` are hard business constraints. Lost/damaged/redispatched dependency records also block. The dependency producer is still P21/P22; P20 tests explicitly label seeded dependency fixtures. No endpoint removes the discrepancy, changes quantities or reopens a day. ERP commercial handling remains external.

P23 now returns `adoptionImplemented:true`. `requires-validation` means only that current metadata found no listed blocker; it never authorizes application. `DeviceAdoptionCommand` references the received action/receipt and expected owner/activity/outcome/source/assignment/pin revisions. The [correction/adoption API](corrections.md) performs current-driver-only validation under the shared invariant locks and rebuilds effective state atomically. `recovery.adoptedOutcomeId` identifies accepted adoption separately from the original immutable receipt. Arrival-only evidence remains unsupported; unknown generations, changed pin, already-adopted evidence and claimed handover add explicit blockers. P34 supplies replay/display. No staff override exists.

Evidence and unresolved results have retention holds. A durable receipt can later permit safe account exit after the local acknowledgement is saved; P20 does not change logout UI or claim a durable browser queue. Expired/revoked sessions must reauthenticate before these APIs; restricted revoked-account evidence upload remains a P35 concern. Unsent data on a lost/cleared phone cannot be recovered.

`device.executionTransferred` and `evidence.received` are durable notification intents addressed only to the affected/submitting account. They carry action/round/driver IDs and generation or rejected/review status/code, never the original envelope, contact details, quantities or device token. The rejected command's business writes roll back before its evidence notification commits; both evidence and notification roll back if either write fails. Exact retries add no notification. They are not ERP business events; delivery/UI consumption remains P25/P30/P34.

P21 may rely on migrations 0012–0018, unchanged round/driver/source/attempt identities, the shared fence, durable evidence/result APIs, and `retry_dependencies` as the tested blocker hook. Its actual receipt writer must acquire the existing driver → workday → assignment → task guards and append dependency facts in its receipt transaction. P21 has not been executed.
