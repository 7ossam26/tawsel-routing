**SUPERSEDED — historical 11-phase package. Do not execute these prompts. Use the [current 42-phase package](../phases/README.md) under D-109.**

# Tawsel phase coverage matrix

This is an implementation assignment map for [the master plan](../../master-plan.md), not a second source of business rules. P01 defines canonical contracts/state/design; later phases update those definitions as implementation becomes concrete. All phase numbers refer to [complete prompts](README.md). All implementation phases are initially not started; see [the execution ledger](../implementation-status.md).

## Business behaviors and action ownership

| Required behavior / action | Contract/state definition | Backend / durable implementation | UI / evidence completion |
| --- | --- | --- | --- |
| Separate company login and B2C phone/password; verified recovery email | [P01](01-foundation-contracts-design.md) | [P03](03-identity-tenancy-database.md) OIDC/session/account data | [P03](03-identity-tenancy-database.md), [P08](08-connected-online-journeys.md) real login/recovery; [P09](09-offline-device-recovery.md) same-account reauth with pending evidence |
| ERP users, branches, one role and inherit/allow/deny exceptions | [P01](01-foundation-contracts-design.md) | [P03](03-identity-tenancy-database.md) provisioning/guards | [P07](07-durable-integration-mock-erp.md) native mock admin; [P08](08-connected-online-journeys.md) authorized context, no unchecked role selector |
| Tenant/branch/driver/integration isolation, actor binding | [P01](01-foundation-contracts-design.md) | [P03](03-identity-tenancy-database.md) foundations, extended by every resource owner phase | [P08](08-connected-online-journeys.md) scoped UI; [P09](09-offline-device-recovery.md) cache; [P10](10-reports-timing-excel.md) export; [P11](11-operations-verification-handoff.md) final cross-boundary proof |
| Minimal execution driver/vehicle profile; no fleet management | [P01](01-foundation-contracts-design.md) | [P03](03-identity-tenancy-database.md) identity/reference; [P04](04-intake-maps-planning.md) planning mode mapping | [P07](07-durable-integration-mock-erp.md) mock provisioning; [P08](08-connected-online-journeys.md) three-mode selection |
| B2C manual name/phone/address/pin, optional collection | [P01](01-foundation-contracts-design.md) | [P04](04-intake-maps-planning.md) persisted intake/location | [P08](08-connected-online-journeys.md) fast entry/mobile pin; [P11](11-operations-verification-handoff.md) real B2C pilot |
| ERP source task content/policy/amounts, exact prepaid allocation | [P01](01-foundation-contracts-design.md) | [P04](04-intake-maps-planning.md) snapshot validation; [P05](05-execution-monitoring.md) outcome arithmetic | [P07](07-durable-integration-mock-erp.md) mock source; [P08](08-connected-online-journeys.md) exact collection feedback |
| Prepared versus definitively received/on-board work | [P01](01-foundation-contracts-design.md) | [P04](04-intake-maps-planning.md) assignment/intake/outbox | [P07](07-durable-integration-mock-erp.md) native source submission; [P08](08-connected-online-journeys.md) upcoming/held distinctions |
| Atomic 50 remaining-stop batch admission, no auto split/backlog | [P01](01-foundation-contracts-design.md) | [P04](04-intake-maps-planning.md) locks/admission; [P05](05-execution-monitoring.md) start race; [P06](06-returns-corrections.md) branch interruption | [P08](08-connected-online-journeys.md) clear rejection; [P11](11-operations-verification-handoff.md) integrated evidence |
| Predeparture removal/reassignment; departed staff lock incl. urgency | [P01](01-foundation-contracts-design.md) | [P04](04-intake-maps-planning.md) normal source edits; [P05](05-execution-monitoring.md) departure/actor guards | [P07](07-durable-integration-mock-erp.md) native mock source; [P08](08-connected-online-journeys.md) allowed/read-only states |
| Search candidates, original address, manual confirmation/correction | [P01](01-foundation-contracts-design.md) | [P04](04-intake-maps-planning.md) Nominatim/pin provenance; [P05](05-execution-monitoring.md) departed driver authority | [P04](04-intake-maps-planning.md) map component; [P08](08-connected-online-journeys.md) complete desktop/mobile journey |
| Car/motorcycle/bicycle; 600-second customer service; explicit origin/endpoint | [P01](01-foundation-contracts-design.md) | [P04](04-intake-maps-planning.md) adapters/plan data | [P08](08-connected-online-journeys.md) preparation; [P11](11-operations-verification-handoff.md) pinned Engine/resource checks |
| Eligible urgent-first, earliest availability, current protection | [P01](01-foundation-contracts-design.md) | [P04](04-intake-maps-planning.md) route strategy; [P05](05-execution-monitoring.md) driver commands/eligibility | [P08](08-connected-online-journeys.md) contextual urgency/deferral; [P09](09-offline-device-recovery.md) pending offline changes |
| Optimization job/status, full/partial/error/manual result, stale-result rejection | [P01](01-foundation-contracts-design.md) | [P04](04-intake-maps-planning.md) durable planning; [P05](05-execution-monitoring.md) start publication | [P08](08-connected-online-journeys.md) real preview/fallback and no false optimized success |
| Online synchronized new-round start; lost response recovery | [P01](01-foundation-contracts-design.md) | [P05](05-execution-monitoring.md) atomic start/idempotency | [P08](08-connected-online-journeys.md) online UI; [P09](09-offline-device-recovery.md) offline prohibition/reopen distinction |
| Explicit heading/arrived/current, separate next suggestion | [P01](01-foundation-contracts-design.md) | [P05](05-execution-monitoring.md) state/progress | [P02](02-ui-foundation-review.md) early interaction; [P08](08-connected-online-journeys.md) real UI; [P09](09-offline-device-recovery.md) pending overlay |
| Recipient call/WhatsApp/external navigation without inferred action | [P01](01-foundation-contracts-design.md) UI contract | [P04](04-intake-maps-planning.md) validated destination; [P05](05-execution-monitoring.md) explicit state boundary | [P08](08-connected-online-journeys.md) real links/handler checks, no call counters |
| Full/partial/refused/no-answer and exact money/quantity conservation | [P01](01-foundation-contracts-design.md) | [P05](05-execution-monitoring.md) ledger/transaction/outbox | [P08](08-connected-online-journeys.md) focused outcomes; [P09](09-offline-device-recovery.md) local capture; [P10](10-reports-timing-excel.md) reports |
| Untouched whole deferral/retry; rejected partial remainder always returns | [P01](01-foundation-contracts-design.md) | [P05](05-execution-monitoring.md) eligibility/history; [P06](06-returns-corrections.md) receipt races | [P08](08-connected-online-journeys.md) contextual actions; [P09](09-offline-device-recovery.md) replay |
| End round/day, midnight-spanning workday and held carry-forward | [P01](01-foundation-contracts-design.md) | [P05](05-execution-monitoring.md) lifecycle; [P06](06-returns-corrections.md) dependency races | [P08](08-connected-online-journeys.md) summary; [P09](09-offline-device-recovery.md) pending close; [P10](10-reports-timing-excel.md) report |
| Same-driver online takeover; one owner; old evidence preserved | [P01](01-foundation-contracts-design.md) | [P05](05-execution-monitoring.md) generations/evidence; [P09](09-offline-device-recovery.md) batch/adoption | [P08](08-connected-online-journeys.md) view/takeover; [P09](09-offline-device-recovery.md) old-phone reconnect |
| Driver source-branch return request and branch activity interruption | [P01](01-foundation-contracts-design.md) | [P06](06-returns-corrections.md) quantity/route/dependency model | [P08](08-connected-online-journeys.md) simple driver journey; [P09](09-offline-device-recovery.md) pending state |
| Native ERP actual subset receipt, no whole-batch gate; loss/damage distinct | [P01](01-foundation-contracts-design.md) | [P06](06-returns-corrections.md) actual receipt/disposition | [P07](07-durable-integration-mock-erp.md) native mock UI/transport; [P08](08-connected-online-journeys.md) driver confirmation state |
| New dispatch cycle only after compatible source return | [P01](01-foundation-contracts-design.md) | [P06](06-returns-corrections.md) redispatch invariants | [P07](07-durable-integration-mock-erp.md) native source; [P08](08-connected-online-journeys.md) held/upcoming history |
| Driver recording correction while day open and no dependent handover | [P01](01-foundation-contracts-design.md) | [P06](06-returns-corrections.md) correction transaction/history | [P08](08-connected-online-journeys.md) focused correction; [P09](09-offline-device-recovery.md) delayed evidence; [P10](10-reports-timing-excel.md) effective report |
| Local capture -> durable received evidence -> accepted state -> ERP applied | [P01](01-foundation-contracts-design.md) | [P05](05-execution-monitoring.md) action/evidence; [P07](07-durable-integration-mock-erp.md) receiver; [P09](09-offline-device-recovery.md) replay | [P08](08-connected-online-journeys.md) actual server feedback; [P09](09-offline-device-recovery.md) complete sync UX |
| Durable ERP source outbox, Tawsel outbox, receiver inbox/projection | [P01](01-foundation-contracts-design.md) | [P04](04-intake-maps-planning.md) intake intent, [P05](05-execution-monitoring.md)/[P06](06-returns-corrections.md) domain intent, [P07](07-durable-integration-mock-erp.md) transport/receiver | [P07](07-durable-integration-mock-erp.md) crash/replay demo; [P11](11-operations-verification-handoff.md) final restore/recovery |
| Signed events, recipient order, duplicates/gaps/replay/checkpoint recovery | [P01](01-foundation-contracts-design.md) | [P07](07-durable-integration-mock-erp.md) | [P07](07-durable-integration-mock-erp.md) operator feedback; [P11](11-operations-verification-handoff.md) measured application lag |
| Coherent monitoring, nonregressing polling, stale/reconnect, idle distinction | [P01](01-foundation-contracts-design.md) | [P05](05-execution-monitoring.md) snapshots; [P07](07-durable-integration-mock-erp.md) integration applied state | [P08](08-connected-online-journeys.md) polling views; [P11](11-operations-verification-handoff.md) measured 3s/5s targets |
| 24-hour offline target, storage failures, safe updates/account isolation | [P01](01-foundation-contracts-design.md) design | [P09](09-offline-device-recovery.md) Dexie/Workbox/replay | [P09](09-offline-device-recovery.md) browser/device tests; [P11](11-operations-verification-handoff.md) unresolved real-time observations |
| Initial/revised forecasts retained and action-time provenance | [P01](01-foundation-contracts-design.md) | [P04](04-intake-maps-planning.md) plan snapshots; [P05](05-execution-monitoring.md) start baseline/actuals; [P09](09-offline-device-recovery.md) clock-quality capture | [P10](10-reports-timing-excel.md) comparison UI/export; never defer data capture until reports |
| Authorized results/timing/collection report and equivalent Excel | [P01](01-foundation-contracts-design.md) | [P10](10-reports-timing-excel.md) queries/export with source data from P04–P09 | [P10](10-reports-timing-excel.md) focused reports/download, [P11](11-operations-verification-handoff.md) owner demonstration |
| Very simple UX and visual reference/component system | [P01](01-foundation-contracts-design.md) DESIGN/UI spec | Backend error/state semantics in owning phases | [P02](02-ui-foundation-review.md) early review; [P08](08-connected-online-journeys.md)/[P09](09-offline-device-recovery.md)/[P10](10-reports-timing-excel.md) connected states; [P11](11-operations-verification-handoff.md) final walkthrough |
| Private safe deployment, compatible migrations, restore and resource diagnostics | [P01](01-foundation-contracts-design.md) initial plan; maintained each phase | [P03](03-identity-tenancy-database.md) DB/identity; [P04](04-intake-maps-planning.md) Engine/assets; [P07](07-durable-integration-mock-erp.md) workers; [P09](09-offline-device-recovery.md) update compatibility | [P11](11-operations-verification-handoff.md) target evidence/owner-led pilot; no presumed capacity |
| Future GPS/native/learning/billing boundary only | [P01](01-foundation-contracts-design.md) documentation | No V1 implementation | [P11](11-operations-verification-handoff.md) handoff note; no telemetry or empty billing tables |

## HTTP and event family coverage

| Canonical family | First working implementation | Important follow-through |
| --- | --- | --- |
| Session/context and integration provisioning | [P03](03-identity-tenancy-database.md) | Mock native issuer/provisioning [P07](07-durable-integration-mock-erp.md); offline safe reauth/logout [P09](09-offline-device-recovery.md) |
| Intake/source snapshots/prepared/assignment/withdrawal | [P04](04-intake-maps-planning.md) | Departure race [P05](05-execution-monitoring.md), redispatch [P06](06-returns-corrections.md), external source outbox [P07](07-durable-integration-mock-erp.md) |
| Geocoding/pin/planning job/draft/manual/forecast | [P04](04-intake-maps-planning.md) | Atomic start/publication/current protection [P05](05-execution-monitoring.md); branch [P06](06-returns-corrections.md); UI [P08](08-connected-online-journeys.md) |
| Round/workday/execution/outcome/urgency/deferral/retry | [P05](05-execution-monitoring.md) | Driver correction/receipt dependencies [P06](06-returns-corrections.md), offline [P09](09-offline-device-recovery.md), reports [P10](10-reports-timing-excel.md) |
| Device takeover/action status/durable evidence | [P05](05-execution-monitoring.md) | Complete sync batch/dependency/adoption/account recovery [P09](09-offline-device-recovery.md) |
| Returns/actual subset receipt/disposition/redispatch | [P06](06-returns-corrections.md) | Native ERP source/receiver [P07](07-durable-integration-mock-erp.md), driver UI [P08](08-connected-online-journeys.md) |
| Monitoring/history/progress snapshots | [P05](05-execution-monitoring.md) | Recipient projection [P07](07-durable-integration-mock-erp.md), polling/recovery UI [P08](08-connected-online-journeys.md) |
| Delivery/applied status, replay/checkpoint/reconciliation | [P07](07-durable-integration-mock-erp.md) | Target timing/recovery [P11](11-operations-verification-handoff.md) |
| Reporting/filter snapshot/export/download | [P10](10-reports-timing-excel.md) | Authorization and target demonstration [P11](11-operations-verification-handoff.md) |
| Event schemas/envelopes | [P01](01-foundation-contracts-design.md) specification | Events persist with each owning domain transaction; sender/receiver transport [P07](07-durable-integration-mock-erp.md) |
| Event business transitions and corrections | [P04](04-intake-maps-planning.md) intake, [P05](05-execution-monitoring.md) execution, [P06](06-returns-corrections.md) returns/corrections | Schema-valid delivery and durable projection [P07](07-durable-integration-mock-erp.md); corrective report [P10](10-reports-timing-excel.md) |
| Replacement progress snapshots versus business-event history | [P05](05-execution-monitoring.md) coherent source | [P07](07-durable-integration-mock-erp.md) deduplication/order/gaps/retention; no lost required transition |

P01's contracts and docs/contract-coverage.md must enumerate actual operation/event IDs and schemas, not leave these families as prose-only placeholders. Later implementation updates the canonical operation map rather than inventing private frontend-only endpoints.

## Data and persistence ownership

| Data group | Schema/runtime phase | Invariants/evidence |
| --- | --- | --- |
| Tenants, subjects, branches, roles, grants, sessions, integration credentials | [P03](03-identity-tenancy-database.md) | Scoping and effective permissions; migrations and isolated PostgreSQL |
| Task/source snapshots, pins, prepared/received assignments, plan/jobs/forecasts | [P04](04-intake-maps-planning.md) | Source uniqueness, capacity, durable input revision and stale-result protection |
| Workdays/rounds/devices/attempts/quantities/collection/progress/actions | [P05](05-execution-monitoring.md) | One active owner, current-next coherence, atomic outcomes/idempotency/audit/outbox |
| Return items, actual receipts, dispositions, corrections, redispatch dependencies | [P06](06-returns-corrections.md) | Piece conservation and dependency races; no false stock/settlement |
| Worker delivery attempts/leases and mock ERP source/inbox/projection | [P07](07-durable-integration-mock-erp.md) | Separate databases, receipt/application distinction, crash-safe recovery |
| Local downloaded snapshots/action journal/pending projection | [P09](09-offline-device-recovery.md) | Account partition, local transaction, ordered replay and durable acknowledgement |
| Report/export artifacts | [P10](10-reports-timing-excel.md) | Snapshot/filter authorization and expiry; no duplicate financial ledger |

Shared audit/idempotency/outbox infrastructure is introduced when needed by the first real modifying operation and reused thereafter; P03/P04 cannot defer required transaction integrity until P05. Transport delivery being later does not excuse missing durable event intent.

## Visual source and extension mapping

All directories below are under stitch-export/screens/. Each has code.html and metadata.json. Reference images are screen.jpg for 01–03 and screen.png for 04–09. Original IDs and exact provenance remain in the manifest, assessment and P01 UI specification.

| Reference directory / intended visual role | Early reference use | Functional implementation / final coverage |
| --- | --- | --- |
| 01-active-driver-trip — map/list and stage hierarchy | [P01](01-foundation-contracts-design.md) specification, [P02](02-ui-foundation-review.md) components | APIs [P04](04-intake-maps-planning.md)/[P05](05-execution-monitoring.md)/[P06](06-returns-corrections.md); connected [P08](08-connected-online-journeys.md); offline [P09](09-offline-device-recovery.md); review [P11](11-operations-verification-handoff.md) |
| 02-stop-details — recipient/actions/detail layout | [P01](01-foundation-contracts-design.md)/[P02](02-ui-foundation-review.md) | Outcome/correction [P05](05-execution-monitoring.md)/[P06](06-returns-corrections.md); UI [P08](08-connected-online-journeys.md); pending [P09](09-offline-device-recovery.md) |
| 03-dispatcher-workspace — selected driver/map/monitoring | [P01](01-foundation-contracts-design.md)/[P02](02-ui-foundation-review.md) | Reads [P05](05-execution-monitoring.md), integration [P07](07-durable-integration-mock-erp.md), UI/polling [P08](08-connected-online-journeys.md), reports [P10](10-reports-timing-excel.md) |
| 04-login-workspace — account entry and context | [P01](01-foundation-contracts-design.md)/[P02](02-ui-foundation-review.md) | Real identity/UI [P03](03-identity-tenancy-database.md), connected context [P08](08-connected-online-journeys.md), recovery [P09](09-offline-device-recovery.md) |
| 05-driver-daily-trips — active/upcoming/ended hierarchy | [P01](01-foundation-contracts-design.md)/[P02](02-ui-foundation-review.md) | Workday data [P04](04-intake-maps-planning.md)/[P05](05-execution-monitoring.md), UI [P08](08-connected-online-journeys.md), pending [P09](09-offline-device-recovery.md), report links [P10](10-reports-timing-excel.md) |
| 06-route-preparation — readiness/stop list/preview | [P01](01-foundation-contracts-design.md) | Intake/plan/map components [P04](04-intake-maps-planning.md), full UI [P08](08-connected-online-journeys.md) |
| 07-location-review — original address/candidates/pin | [P01](01-foundation-contracts-design.md) | Adapter/map [P04](04-intake-maps-planning.md), desktop/mobile journey [P08](08-connected-online-journeys.md) |
| 08-trip-completion — result summary | [P01](01-foundation-contracts-design.md)/[P02](02-ui-foundation-review.md) status continuity | Online closure [P05](05-execution-monitoring.md)/[P08](08-connected-online-journeys.md), pending [P09](09-offline-device-recovery.md), complete report [P10](10-reports-timing-excel.md) |
| 09-sync-conflicts — pending/received/review filters | [P01](01-foundation-contracts-design.md)/[P02](02-ui-foundation-review.md) status continuity | Evidence [P05](05-execution-monitoring.md)/[P06](06-returns-corrections.md), receiver [P07](07-durable-integration-mock-erp.md), online view [P08](08-connected-online-journeys.md), offline/conflict [P09](09-offline-device-recovery.md) |
| New B2C registration/recovery/account states | [P01](01-foundation-contracts-design.md) requirements, [P02](02-ui-foundation-review.md) visual convention | [P03](03-identity-tenancy-database.md) and [P08](08-connected-online-journeys.md), pending-account handling [P09](09-offline-device-recovery.md) |
| New fast intake/mobile pin/manual route/partial result | [P01](01-foundation-contracts-design.md) requirements | [P04](04-intake-maps-planning.md) API/components, [P08](08-connected-online-journeys.md) full journey |
| New partial/refusal/urgency/deferral/retry/correction/return/takeover views | [P01](01-foundation-contracts-design.md) action hierarchy, [P02](02-ui-foundation-review.md) focused interaction samples | [P05](05-execution-monitoring.md)/[P06](06-returns-corrections.md) rules, [P08](08-connected-online-journeys.md) UI, [P09](09-offline-device-recovery.md) replay/conflicts |
| Native mock ERP source/receipt/disposition/diagnostics | [P01](01-foundation-contracts-design.md) boundary | [P07](07-durable-integration-mock-erp.md) labelled native mock, contracts from [P03](03-identity-tenancy-database.md)–[P06](06-returns-corrections.md) |
| New forecast/report/Excel detail and authorized operations diagnostics | [P01](01-foundation-contracts-design.md) requirements | Reports [P10](10-reports-timing-excel.md); integration diagnostics [P07](07-durable-integration-mock-erp.md) and owner runbook [P11](11-operations-verification-handoff.md) |

The required unit is a coherent journey/action/state, not copying nine fixed pages. Every UI phase checks Driver simplicity, Routes and actions, State copy and feedback, Components and overlays, Screen coverage and Visual acceptance in docs/ui-spec.md, plus DESIGN.md and actual review notes.

## Required Vitest ownership

| Test file / scenario from master plan | First meaningful phase | Extensions and other evidence |
| --- | --- | --- |
| Contract/schema/example tests and Vitest project config | [P01](01-foundation-contracts-design.md) | Validate real captured payloads in every implementation phase |
| authorization-isolation.test.ts plus session tests | [P03](03-identity-tenancy-database.md) | Resource scopes [P04](04-intake-maps-planning.md)–[P09](09-offline-device-recovery.md), reports/export [P10](10-reports-timing-excel.md) |
| outcome-progress-outbox.test.ts | [P05](05-execution-monitoring.md) | Physical receipt/correction [P06](06-returns-corrections.md), transported events [P07](07-durable-integration-mock-erp.md) |
| start-assignment-race.test.ts | [P05](05-execution-monitoring.md) | Admission foundation [P04](04-intake-maps-planning.md); offline new-start refusal [P09](09-offline-device-recovery.md) |
| planning-publication.test.ts | [P04](04-intake-maps-planning.md) | Start/current races [P05](05-execution-monitoring.md), branch interruption [P06](06-returns-corrections.md) |
| partial-return-correction.test.ts | [P06](06-returns-corrections.md) | Native source/consumer [P07](07-durable-integration-mock-erp.md), effective reports [P10](10-reports-timing-excel.md) |
| outbox-inbox-recovery.test.ts | [P07](07-durable-integration-mock-erp.md) | Target restart/restore and measured lag [P11](11-operations-verification-handoff.md) |
| offline-device-takeover.test.ts | [P09](09-offline-device-recovery.md) | Owner generation source tests [P05](05-execution-monitoring.md); real PWA/device checks [P09](09-offline-device-recovery.md)/[P11](11-operations-verification-handoff.md) |
| driver-flow.test.tsx | [P02](02-ui-foundation-review.md) fixture/component behavior | Real-response UI [P08](08-connected-online-journeys.md), offline [P09](09-offline-device-recovery.md), reports [P10](10-reports-timing-excel.md); browser end-to-end evidence stays distinct |
| Report/export integration tests | [P10](10-reports-timing-excel.md) | Final target demo [P11](11-operations-verification-handoff.md) |

Use actual repository paths from the master-plan examples or a documented equivalent. The matrix assigns meaningful test creation, not empty filenames. Do not wrap independent-connection/crash scenarios in one outer rollback transaction or mock all database guarantees. Do not claim a simulated clock jump is a real 24-hour device observation.

## Acceptance groups A–P

| Group | Primary implementation / evidence | Final verification |
| --- | --- | --- |
| A B2C real journey | [P03](03-identity-tenancy-database.md)/[P04](04-intake-maps-planning.md)/[P05](05-execution-monitoring.md)/[P08](08-connected-online-journeys.md)/[P09](09-offline-device-recovery.md)/[P10](10-reports-timing-excel.md) | [P11](11-operations-verification-handoff.md) |
| B B2B boundary | [P04](04-intake-maps-planning.md)/[P05](05-execution-monitoring.md)/[P06](06-returns-corrections.md)/[P07](07-durable-integration-mock-erp.md) | [P11](11-operations-verification-handoff.md) |
| C Admission/authority | [P03](03-identity-tenancy-database.md)/[P04](04-intake-maps-planning.md)/[P05](05-execution-monitoring.md) | [P11](11-operations-verification-handoff.md) |
| D Execution | [P05](05-execution-monitoring.md)/[P06](06-returns-corrections.md)/[P08](08-connected-online-journeys.md)/[P09](09-offline-device-recovery.md) | [P11](11-operations-verification-handoff.md) |
| E Quantities/money | [P04](04-intake-maps-planning.md)/[P05](05-execution-monitoring.md)/[P06](06-returns-corrections.md)/[P10](10-reports-timing-excel.md) | [P11](11-operations-verification-handoff.md) |
| F Returns/corrections | [P06](06-returns-corrections.md)/[P07](07-durable-integration-mock-erp.md)/[P08](08-connected-online-journeys.md) | [P11](11-operations-verification-handoff.md) |
| G Atomicity | [P04](04-intake-maps-planning.md)/[P05](05-execution-monitoring.md)/[P06](06-returns-corrections.md) | [P11](11-operations-verification-handoff.md) |
| H Durable synchronization | [P07](07-durable-integration-mock-erp.md)/[P09](09-offline-device-recovery.md) | [P11](11-operations-verification-handoff.md) |
| I Offline/device | [P05](05-execution-monitoring.md)/[P09](09-offline-device-recovery.md) | [P11](11-operations-verification-handoff.md) |
| J Planning failure | [P04](04-intake-maps-planning.md)/[P05](05-execution-monitoring.md)/[P06](06-returns-corrections.md) | [P11](11-operations-verification-handoff.md) |
| K Monitoring | [P05](05-execution-monitoring.md)/[P07](07-durable-integration-mock-erp.md)/[P08](08-connected-online-journeys.md) | [P11](11-operations-verification-handoff.md) measured conditions |
| L Isolation | [P03](03-identity-tenancy-database.md) onward, including [P09](09-offline-device-recovery.md)/[P10](10-reports-timing-excel.md) | [P11](11-operations-verification-handoff.md) |
| M Time/report | Capture [P04](04-intake-maps-planning.md)/[P05](05-execution-monitoring.md)/[P09](09-offline-device-recovery.md), reports [P10](10-reports-timing-excel.md) | [P11](11-operations-verification-handoff.md) |
| N Visual/function | [P02](02-ui-foundation-review.md)/[P03](03-identity-tenancy-database.md)/[P04](04-intake-maps-planning.md)/[P07](07-durable-integration-mock-erp.md)/[P08](08-connected-online-journeys.md)/[P09](09-offline-device-recovery.md)/[P10](10-reports-timing-excel.md) | [P11](11-operations-verification-handoff.md) |
| O Operations | Configuration maintained from [P01](01-foundation-contracts-design.md) onward | [P11](11-operations-verification-handoff.md) restore/deploy/resource evidence |
| P Driver simplicity | [P01](01-foundation-contracts-design.md) specification, [P02](02-ui-foundation-review.md) early review, all connected UI phases | [P11](11-operations-verification-handoff.md) owner walkthrough |

## Documentation and deliverable ownership

| Artifact | Created / maintained |
| --- | --- |
| master-plan.md / TAWSEL-DISCOVERY-LOG.md | Existing baseline; record only actual amendments/decisions, preserve history |
| DESIGN.md / docs/ui-spec.md | [P01](01-foundation-contracts-design.md), used/maintained by all UI and API consumer phases |
| contracts/openapi.yaml / contracts/events / contracts/examples / generated reference and client | [P01](01-foundation-contracts-design.md) canonical specification/tooling; updated in the same phase as implementation changes |
| docs/contract-coverage.md | [P01](01-foundation-contracts-design.md) exact operation/event IDs mapped to phases; each owner updates designed/implemented/verified status |
| docs/tracking-and-consistency.md | [P01](01-foundation-contracts-design.md) complete design; [P03](03-identity-tenancy-database.md)–[P09](09-offline-device-recovery.md) update actual invariants/algorithms |
| docs/integration-guide.md | [P01](01-foundation-contracts-design.md) contract obligations; [P03](03-identity-tenancy-database.md)–[P07](07-durable-integration-mock-erp.md) actual configuration/protocol; [P11](11-operations-verification-handoff.md) final alignment |
| docs/ui-review.md | [P02](02-ui-foundation-review.md) actual renders/review notes; all later UI phases extend |
| docs/verification/integration.md | [P07](07-durable-integration-mock-erp.md) reproducible messages, crashes/recovery and observed timing |
| docs/reporting.md | [P10](10-reports-timing-excel.md) actual semantics/columns/snapshot policy |
| README.md / .env.example / docs/operations.md | [P01](01-foundation-contracts-design.md) substantive workspace/setup baseline; maintained every phase; completed/measured [P11](11-operations-verification-handoff.md) |
| docs/ERP-INTEGRATION-HANDOFF.md | [P11](11-operations-verification-handoff.md) as-built released boundary/evidence; never a generic copy of the initial plan |
| docs/verification/pilot-readiness.md | [P11](11-operations-verification-handoff.md) release/config versions, A–P results, limits, actual owner/target evidence |
| docs/implementation-status.md | Created with phase package; updated after every phase with actual outcomes and gaps |

No future file named here is considered delivered until its responsible phase produces substantive, validated content. Original Engine reports/exports retain provenance; current implementation guidance must not rewrite historical measurements into new claims.
