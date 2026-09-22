# ERP planning input — designed foundation

This is reusable input for a **separate** real ERP/connector project under D-111/D-112. Tawsel implements the workspace, schema/reference/client tooling, P04 development UI fixtures and P05 PostgreSQL command kernel. Delivery execution, source provisioning, signed events and external receiver behavior remain designed. Consult [current evidence](../implementation-status.md), not a planning status as proof.

P05 verifies internal same-ID retry/collision handling, rollback, independent-connection races, process loss and response compaction. The public `action.getResult` operation is still unavailable pending authenticated P06–P08 bindings. Its canonical [ActionResult](../../contracts/action-result.v1.schema.json) preserves a receipt and minimal feature summary after full-response compaction; consumers must not issue a new action ID to evade uncertainty or retention. A source identity is stable across credential refresh/rotation. Preserve the exact immutable semantic envelope, including original observations/dependencies; changed content under the same scoped ID conflicts. [Hash/lock/retention rules](../tracking-and-consistency.md#implemented-p05-transaction-protocol) describe the implementation.

The full-response floor is 30 days; unresolved outbox/review/explicit holds prevent compaction. Audit/evidence/identity remain, and an outbox row proves intent only. Run `npm run test:contracts` and the public client typecheck for schema conformance; `npm run db:demo` and `npm run test:database` are internal infrastructure evidence, not ERP delivery or real vendor compatibility. Consumer HTTP quickstart/conformance still belongs to P26–P27; no database access is required or allowed for an external connector.

Phase 03 adds the [UI/action specification](../ui-spec.md) and [complete operation-to-surface mapping](../ui-actions.md), without changing this public protocol. The native ERP owns A06–A08 preparation/assignment, A29 actual subset receipt/disposition, A31 redispatch and A43 identity administration. Their Tawsel counterparts are upcoming/received read views, source-branch request/status and departed read-only monitoring—not duplicate commercial/warehouse editors. The mock UI in P27 must demonstrate that same external boundary.

Connector-facing feedback must distinguish source command pending/accepted/rejected, return offered/actually received/disposed, and Tawsel business acceptance/event delivery receipt/ERP application. An end-day badge never means cash settled or goods received. Staff cannot correct a departed driver outcome; a received conflict can only follow the owning-driver bounded correction/adoption rules. A stale monitoring view labels its last successful update and cannot infer unsent phone actions. These are designed UX requirements for consuming existing contracts; no new status enum or endpoint is introduced.

## Responsibility and compatibility target

P06 now verifies the internal membership/capability model and [permission contract](../authorization.md) using actual PostgreSQL with labelled authenticated-principal fixtures. A company user has one role and explicit `inherit/allow/deny` exceptions; permissions are identical across assigned branches, while tenant/branch/driver/source/lifecycle remain separate mandatory checks. `CapabilityOverride` and server-resolved `AccessContext` are canonical common schemas. Role labels grant nothing; a service cannot claim a human via `assertedActorId`. P07/P08 must supply real authentication and verified provisioning/delegation. ERP remains the administration surface, with no duplicate Tawsel editor.

Schema/consumer checks: `npm run test:contracts`, `npm run contracts:check`, `npm run typecheck -w @tawsel/api-client`. Internal isolation/demo: `npm run test:authorization`, `npm run access:demo`. The latter are **not** a public HTTP quickstart or real ERP conformance. P26/P27 still own that separate proof. In a shared driver trip, source projections must exclude other-source contacts, counts and current/next detail; explicit allow never restores postdeparture staff edits. [P06 evidence](../phase-06-evidence.md) records actual proof and limits.

| Owner | Responsibility | Explicit boundary |
| --- | --- | --- |
| ERP/vendor system | Commercial order/customer master, source identities, shipment content/final prices/fees/allocated prepayment, branches/users/role/memberships, preparation/initial received assignment, actual branch receipt/disposition, inventory/liability/settlement | Tawsel does not require its source code or database schema and never becomes its finance/stock system. |
| Tawsel | Generic accepted task/contact/location/requirements snapshots; task/dispatch/assignment execution, workday/trip/plan/attempt/outcome identities, reports of collection, coherent progress/forecasts, driver pin correction, integration evidence | Execution does not prove a bank payment, stock availability from a return request, live GPS or instant offline revocation. All these business capabilities remain designed now. |
| Shared identity authority | Credentials/authenticated subjects; issuer authentication/recovery | ERP and Tawsel use separate clients/sessions; no copied password hashes or synchronous ERP lookup for every outcome. |
| Connector (ERP vendor/agency, Tawsel, or jointly owned) | Translate supported vendor interface into generic source commands and map public events back; durable outbox/inbox, IDs/revisions, auth/actor binding, reconciliation, monitoring and upgrades | Uses released public API/webhooks and scoped credentials. No imports of Tawsel internals, shared database, cross-database joins or raw Engine payloads. |

Before promising feasibility, inventory supported REST/other APIs, webhooks, integration modules, authentication, stable IDs, import/export and vendor-supported extension mechanisms. Record API limits, polling/change tracking, idempotency and transaction/outbox support. If no suitable interface exists, obtain vendor cooperation or an ERP-side adapter. An import/export surface may constrain latency and writeback; the connector must measure the resulting behavior rather than claiming real-time compatibility. A reference mock proves the released boundary, not every vendor ERP.

## Generic concepts the ERP can plan against

Stable source task/order references are scoped by tenant/integration and mapped to UUIDs. Snapshot generic contact/name/phone, original address and confirmed location provenance, delivery instructions, optional time window/service duration/priority. Tawsel resources are task, dispatch cycle, assignment, trip/round, workday, plan revision, stop/attempt, outcome and receipt/disposition. A task can have many cycles/attempts; two shipments at one address stay independent. Do not map all of these to one ERP status or overwrite one external ID with another.

`contracts/common.schema.json` owns shared values, envelopes carry explicit versions/revisions and action/event IDs, and [the catalog](../contract-coverage.md) owns operation names. `DeliverySnapshot` is deliberately not a full intake request. P10 completes B2B line/branch/driver/permission/due allocation fields and rejected examples before admitting source work. P08 completes trusted provisioning/identity. P21/P22 complete subset receipt and new-cycle mapping. P25 completes signatures/wire delivery. Do not build against unimplemented URL guesses.

## Small ordered connector slices and their proof

| Slice / dependency | ERP-side work | Tawsel owner and required observable proof |
| --- | --- | --- |
| 1. Capability discovery / commercial agreement | Identify vendor-supported interfaces, ownership, stable IDs and data availability; leave unsupported capabilities explicit | D-112; no runtime conformance claim from discovery alone |
| 2. Identity/source binding | Configure isolated tenant/integration credentials, issuer trust, branches/users/one role/overrides/memberships/driver mapping, actor delegation and rotation | P08; provision → real login → allowed read → role/disable denial, forged actor/wrong-source rejection |
| 3. Durable source snapshots and commands | Commit native source change + outgoing intent locally; map generic snapshots, source revision and action identity; show pending/accepted/rejected | P10 contract + P27 source; duplicates/lost reply recover the same result, unsupported due allocation rejects, over-50 batch rejects wholly |
| 4. Driver execution observation | Consume scoped task/trip/assignment/history snapshots; do not mirror driver execution with unrestricted ERP edits | P15–24; departure lock, distinct heading/arrival/outcomes, coherent mixed-source isolation |
| 5. Durable signed receiver | Verify exact bytes/auth/recipient/version, commit inbox before receipt, apply projection + processed marker together; handle duplicates/gaps | P25/P26; independent process/database, sender/receiver crash and lost-ack proof, received distinct from applied |
| 6. Native returns and fresh dispatch | Present actual requested source-branch pieces, confirm actual subsets or explicit loss/damage; map new dispatch separately | P21/P22/P27; no request-as-stock, independent subset continuation, preserved missing pieces and old history |
| 7. Two-way recovery and upgrades | Reconcile expired replay windows, preserve unresolved commands/old versions, schedule workers, alert on lag and exercise rotation | P26/P27 initial external conformance; P34/P35 old-device/offline payloads; P42 clean final-release rerun |

The future `tests/erp-conformance/` suite and consumer quickstart arrive in P26/P27. It must run with only public artifacts, API/callback URLs, scoped credentials and signature configuration, against separate storage. Required journey: provisioning → preparation → received assignment → planning/start → outcome → signed durable receipt → ERP applied projection → subset return receipt → new dispatch. Include wrong scope/actor, duplicate/changed-payload ID, sender/receiver restart, stale revisions, unsupported version, sequence gaps and expired-history recovery. These are acceptance obligations, not tests run in P02.

## Constraints the connector must preserve

- Prepared is not received. Definitive ERP assignment asserts physical possession; Tawsel admission is atomic. Cap is 50 remaining planned stops including planned branch visits, not a daily task limit, weight/volume allocator or permission to split an incoming batch.
- Postdeparture general staff changes are forbidden, including urgency; driver execution/pin/urgency/bounded correction and actual native receipt/disposition are separately authorized. ERP user disabling stays independent. No direct driver transfer.
- Whole pieces only; splitting is explicit B2B permission. Final collectable per-piece and shipping due must be supplied with exact prepaid allocation sufficient for allowed outcomes. No guessed deposit split, float money, double prepaid/shipping charge or arbitrary underpayment. Reported collection is not settlement.
- Whole-task retry before receipt is narrow and driver-owned; rejected partial remainder cannot be revisited. Actual receipt permits a new cycle; loss is not receipt/available stock. Source branch only, no mandatory whole-batch clearance or second staff approval of driver execution.
- Workday crosses midnight and closes explicitly; unfinished held work carries forward without source resubmission. Device capture/server receipt/business commit/ERP application times differ. Cairo rendering uses timezone rules.
- Body source/actor IDs cannot override credentials; mixed-source trips expose only authorized projection. Source revisions, assignment/device generations, route/snapshot revisions and recipient event sequences are different fields.
- Delivery is at least once. Persist ID/result mappings and apply transitions idempotently. A newer progress view cannot consume or erase an unprocessed business transition. Preserve unresolved evidence; proposed 30-day replay floors are not permission for automatic purge.
- No V1 GPS, billing, call counters, advanced POD, financial settlement or full ERP implementation. B2C has no item splitting or branch custody. Online start and receipt confirmation remain online; downloaded started execution can capture pending offline evidence without immediate ERP knowledge.

## Unknown real-ERP choices — deliberately unfilled

| Required discovery / decision | Current value | Responsible implementer |
| --- | --- | --- |
| Vendor/version, supported API/webhooks/modules/import-export; quotas/change tracking | **Unknown** | ERP vendor + connector owner |
| Real company/branch/user/driver/order/shipment/line/dispatch IDs; status/field mapping | **Unknown**, no vendor schema copied into core | ERP domain owner + connector owner |
| Exact final-price/shipping/prepayment allocation sources and explicit split permission | **Unknown source mapping**; Tawsel no-guessing rules fixed | ERP commercial owner, P10 mapping maintainer |
| Identity realms/clients/subjects, company discovery, actor delegation and revocation deployment | **Unknown deployment**, shared authority/separate sessions fixed | Identity operator + P08/connector owner |
| Native role/membership/receipt/disposition screen hooks and verified human actor binding | **Unknown vendor surface** | ERP UI/vendor team + connector owner |
| Source outbox/inbox tables/storage technology, worker scheduler, leases and reconciliation ownership | **Unknown implementation**; local atomicity required | Connector owner / ERP operator |
| URLs, network/TLS, endpoint destination controls, credentials/key storage and rotation operators | **Unknown**, no invented hostnames/secrets | Tawsel + ERP operators |
| ERP native financial/inventory representation of reported collection, returned/lost goods | **Unknown**, owned by ERP; no Tawsel settlement/valuation schema | ERP business owner |
| Capacity/freshness under its interface limits, retention/privacy policy and tested upgrade/rollback | **Unmeasured/unconfigured** | Joint operators; P38/P39/P42 evidence owners |

These unknowns do not reopen accepted Tawsel behavior. Each affected phase updates this input, the mapping, canonical examples/client and available consumer conformance together. P42 packages actual release identity/digests and verified limits; it cannot retroactively replace missing external proof with documentation.
