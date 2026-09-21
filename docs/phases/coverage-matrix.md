# Tawsel — current requirements and phase coverage

Package revision 3, D-109–D-111. This maps current behavior to bounded implementation phases. It does not replace the [master plan](../../master-plan.md) or claim runtime completion.
Read [decision-map.md](decision-map.md) when an older answer differs. All phases start unimplemented; [the ledger](../implementation-status.md) records actual evidence.

Each requirement below embeds its current meaning. **Owner phases** produce the implementation/design; **follow-through** phases integrate UI, dependent rules or verification. This is not permission to defer all tests to the last phase.
Initial engineering requirements without a numbered discovery answer remain traced to the master plan; proposed numerical targets retain their proposal/evidence status.

## Current requirement catalog

### R-01

**Shared isolated product.** One maintained tenant-aware application; independent accounts have personal tenants. Scope records, jobs, cache, recipients and exports consistently.

- Source: D-15, D-27.
- Owner phases: [P06](06-tenant-capabilities-isolation.md).
- Follow-through: [P08](08-erp-provisioning-actor-binding.md), [P24](24-coherent-monitoring-api.md), [P33](33-offline-local-capture.md), [P37](37-authorized-excel-export.md), [P42](42-final-contract-readiness-handoff.md).

### R-02

**ERP administration authority.** ERP owns commercial/source data, company users/branches and initial assignment. Tawsel owns execution; do not duplicate a commercial admin module.

- Source: D-01, D-14, D-84.
- Owner phases: [P08](08-erp-provisioning-actor-binding.md), [P10](10-b2b-intake-admission.md).
- Follow-through: [P27](27-native-mock-erp-source.md), [P28](28-online-preparation-journeys.md), [P42](42-final-contract-readiness-handoff.md).

### R-03

**Configurable role and direct exceptions.** One ERP-defined role per user; inherit/allow/deny user exception overrides inheritance. No role-name grants or lifecycle bypass.

- Source: D-02, D-03, D-16, D-59, D-90.
- Owner phases: [P06](06-tenant-capabilities-isolation.md).
- Follow-through: [P08](08-erp-provisioning-actor-binding.md), [P27](27-native-mock-erp-source.md), [P42](42-final-contract-readiness-handoff.md).

### R-04

**Multiple branches.** Identical effective capabilities across all assigned branches; unrelated branch resources remain forbidden. D-25 replaces single-branch D-17.

- Source: D-04, D-17, D-25.
- Owner phases: [P06](06-tenant-capabilities-isolation.md).
- Follow-through: [P08](08-erp-provisioning-actor-binding.md), [P24](24-coherent-monitoring-api.md), [P32](32-monitoring-sync-online-ui.md).

### R-05

**Separate account paths.** Company and B2C are separate logins, sessions and cached data. No silent linked-workspace/account merge.

- Source: D-15, D-26, D-27, D-58.
- Owner phases: [P07](07-oidc-login-recovery-sessions.md).
- Follow-through: [P09](09-b2c-task-intake.md), [P28](28-online-preparation-journeys.md), [P35](35-offline-auth-updates-ux.md).

### R-06

**Shared company identity.** Company code then credentials at common authority; independent Tawsel/ERP sessions, verified subject/actor and no password-hash copying or per-command ERP dependency.

- Source: D-01, D-58, D-84.
- Owner phases: [P07](07-oidc-login-recovery-sessions.md), [P08](08-erp-provisioning-actor-binding.md).
- Follow-through: [P27](27-native-mock-erp-source.md), [P39](39-deployment-migration-release.md).

### R-07

**B2C login/recovery.** Phone/password login, verified recovery email only, no implied SMS verification; clear registration/recovery/account activation behavior.

- Source: D-58, D-74, D-83.
- Owner phases: [P07](07-oidc-login-recovery-sessions.md).
- Follow-through: [P35](35-offline-auth-updates-ux.md), [P41](41-device-owner-pilot-review.md).

### R-08

**Atomic commands and identity.** State, effective progress, audit, idempotency result and outbound intent commit together. Same ID/payload returns same result; mismatch conflicts; real lock/constraint evidence.

- Source: original architecture/integration requirements; master-plan sections 10/17/18, with operational targets still proposed.
- Owner phases: [P05](05-postgres-atomic-command-kernel.md).
- Follow-through: [P10](10-b2b-intake-admission.md), [P15](15-round-start-departure-lock.md), [P17](17-outcomes-quantities-collection.md), [P21](21-source-return-receipt.md), [P23](23-bounded-driver-corrections.md), [P34](34-ordered-replay-conflict-recovery.md).

### R-09

**Source snapshots and allocation.** Stable source/cycle/line references, frozen content/prices and exact outstanding unit/shipping allocations. No raw ERP DB reads or invented prepaid allocation.

- Source: D-14, D-33, D-52, D-92.
- Owner phases: [P10](10-b2b-intake-admission.md).
- Follow-through: [P17](17-outcomes-quantities-collection.md), [P23](23-bounded-driver-corrections.md), [P27](27-native-mock-erp-source.md).

### R-10

**Prepared versus received.** Prepared is upcoming, not held. Definitive ERP assignment asserts receipt and queues planning; Engine failure cannot reverse accepted receipt.

- Source: D-07, D-18, D-33, D-39.
- Owner phases: [P10](10-b2b-intake-admission.md).
- Follow-through: [P13](13-planning-jobs-forecast-storage.md), [P27](27-native-mock-erp-source.md), [P28](28-online-preparation-journeys.md).

### R-11

**Predeparture list changes.** Ordinary ERP removal/reassignment before departure needs no mandatory reason or handover ceremony; serialize with start and retain history.

- Source: D-22, D-33, D-40.
- Owner phases: [P10](10-b2b-intake-admission.md), [P15](15-round-start-departure-lock.md).
- Follow-through: [P27](27-native-mock-erp-source.md), [P42](42-final-contract-readiness-handoff.md).

### R-12

**Departure authority.** Freeze general staff edits including urgency at start/active admission. Only driver execution and narrow actual source receipt/disposition exceptions; no staff result override.

- Source: D-35, D-52, D-73, D-91, D-95, D-101.
- Owner phases: [P15](15-round-start-departure-lock.md).
- Follow-through: [P18](18-deferral-retry-driver-urgency.md), [P21](21-source-return-receipt.md), [P23](23-bounded-driver-corrections.md), [P30](30-driver-exception-correction-ui.md), [P32](32-monitoring-sync-online-ui.md).

### R-13

**Remaining-route capacity.** At most 50 remaining planned stops including branch service. Entire incoming over-limit batch rejected; no daily cap, partial assignment or hidden overflow. Reactivation also validates capacity.

- Source: D-57, D-66.
- Owner phases: [P10](10-b2b-intake-admission.md).
- Follow-through: [P14](14-route-policy-manual-fallback.md), [P15](15-round-start-departure-lock.md), [P18](18-deferral-retry-driver-urgency.md), [P22](22-branch-interruption-redispatch.md).

### R-14

**Independent shipments.** Same recipient/location does not merge shipment identity, outcome, money or counting.

- Source: D-56.
- Owner phases: [P09](09-b2c-task-intake.md), [P10](10-b2b-intake-admission.md).
- Follow-through: [P14](14-route-policy-manual-fallback.md), [P17](17-outcomes-quantities-collection.md), [P36](36-workday-timing-reports.md).

### R-15

**Fast B2C intake/scope.** Own name/mandatory phone/address-or-confirmed-pin with optional collection; simple outcomes/report. No item splitting, branch custody or employer workflows.

- Source: D-15, D-26, D-53, D-54, D-89, D-99.
- Owner phases: [P09](09-b2c-task-intake.md).
- Follow-through: [P11](11-locations-map-assets.md), [P17](17-outcomes-quantities-collection.md), [P28](28-online-preparation-journeys.md), [P29](29-ordinary-driver-delivery-ui.md), [P36](36-workday-timing-reports.md).

### R-16

**Whole-piece partial delivery.** B2B only, source permission and stable lines; whole pieces. Rejected remainder always returns, never another customer visit or deferred remainder.

- Source: D-36, D-46, D-47, D-48, D-49, D-89, D-93.
- Owner phases: [P17](17-outcomes-quantities-collection.md).
- Follow-through: [P18](18-deferral-retry-driver-urgency.md), [P21](21-source-return-receipt.md), [P30](30-driver-exception-correction-ui.md).

### R-17

**Exact reported collection.** Full/partial/refusal/shipping exception remain distinct: 3×100+50 gives 350 full, 250 for two, 50 refused shipping-paid, or explicit unpaid-50/zero collection. No arbitrary short pay or settlement.

- Source: D-11, D-23, D-24, D-36, D-47, D-51.
- Owner phases: [P17](17-outcomes-quantities-collection.md).
- Follow-through: [P23](23-bounded-driver-corrections.md), [P29](29-ordinary-driver-delivery-ui.md), [P30](30-driver-exception-correction-ui.md), [P36](36-workday-timing-reports.md).

### R-18

**Prepaid and repeated collection.** Do not recollect prepaid goods/shipping or prior attempt fees. Reject ambiguous allocation rather than invent proportional distribution; preserve source prices through correction.

- Source: D-23, D-52, D-92.
- Owner phases: [P10](10-b2b-intake-admission.md), [P17](17-outcomes-quantities-collection.md).
- Follow-through: [P18](18-deferral-retry-driver-urgency.md), [P23](23-bounded-driver-corrections.md), [P36](36-workday-timing-reports.md).

### R-19

**Location provenance and correction.** Keep original source address, candidates and confirmed execution pin separate. Manual confirmation; authorized predeparture staff or assigned driver correction; bad pin blocks affected work.

- Source: D-30, D-55, D-99.
- Owner phases: [P11](11-locations-map-assets.md).
- Follow-through: [P15](15-round-start-departure-lock.md), [P28](28-online-preparation-journeys.md), [P30](30-driver-exception-correction-ui.md).

### R-20

**No GPS and physical origin.** Use last confirmed physical stop or explicit manual/branch origin. Phone outcome does not move origin; no GPS, inferred accuracy or link-import dependency.

- Source: D-18, D-30.
- Owner phases: [P11](11-locations-map-assets.md), [P12](12-engine-profile-adapters.md).
- Follow-through: [P16](16-current-heading-arrival.md), [P28](28-online-preparation-journeys.md), [P42](42-final-contract-readiness-handoff.md).

### R-21

**Three transport modes.** Car, motorcycle and bicycle map to verified actual Engine services/profiles; config text alone is not live proof.

- Source: D-70.
- Owner phases: [P12](12-engine-profile-adapters.md).
- Follow-through: [P14](14-route-policy-manual-fallback.md), [P28](28-online-preparation-journeys.md), [P41](41-device-owner-pilot-review.md).

### R-22

**Service-time estimate.** 600-second default customer service; branch activity has separate estimate. No mandatory per-stop timing entry or dwell-measurement claim.

- Source: D-72.
- Owner phases: [P12](12-engine-profile-adapters.md).
- Follow-through: [P13](13-planning-jobs-forecast-storage.md), [P36](36-workday-timing-reports.md).

### R-23

**Endpoint and finish estimate.** Last customer default; explicit branch visit and optional B2C fixed endpoint. Expected finish only, no hard shift end or implied actual arrival/return.

- Source: D-71, D-82.
- Owner phases: [P12](12-engine-profile-adapters.md), [P14](14-route-policy-manual-fallback.md).
- Follow-through: [P28](28-online-preparation-journeys.md), [P36](36-workday-timing-reports.md).

### R-24

**Whole deferral/earliest time.** Untouched whole work can be deferred to at-or-after date/time, preserved across days. No narrow appointment guarantee or rejected-partial-remnant deferral.

- Source: D-06, D-20, D-37, D-49.
- Owner phases: [P18](18-deferral-retry-driver-urgency.md).
- Follow-through: [P14](14-route-policy-manual-fallback.md), [P19](19-workday-closure-carryover.md), [P30](30-driver-exception-correction-ui.md).

### R-25

**Urgency authority and order.** ERP before departure, assigned driver afterward. Protect current, then eligible urgents before ordinary; honor earliest; VROOM priority alone insufficient.

- Source: D-94, D-97, D-98, D-101.
- Owner phases: [P14](14-route-policy-manual-fallback.md), [P18](18-deferral-retry-driver-urgency.md).
- Follow-through: [P15](15-round-start-departure-lock.md), [P30](30-driver-exception-correction-ui.md).

### R-26

**Explicit stage/current versus next.** Start/heading/arrival are explicit. Next is a suggestion; outcome/contact/nav do not imply travel or arrival. One current protected through replan.

- Source: D-05, D-19.
- Owner phases: [P16](16-current-heading-arrival.md).
- Follow-through: [P14](14-route-policy-manual-fallback.md), [P17](17-outcomes-quantities-collection.md), [P29](29-ordinary-driver-delivery-ui.md).

### R-27

**Online synchronized new start.** Every new round needs relevant sync, latest authorized work and server-confirmed start before first departure. No extra dispatcher approval; lost response/duplicate phones recover one round.

- Source: D-29, D-40, D-78, D-81.
- Owner phases: [P15](15-round-start-departure-lock.md).
- Follow-through: [P20](20-device-takeover-evidence.md), [P28](28-online-preparation-journeys.md), [P34](34-ordered-replay-conflict-recovery.md).

### R-28

**Durable planning and manual fallback.** Job input revisions/fingerprints; stale results cannot overwrite changes. Validate all IDs/unassigned/whole route. Engine failure retains usable last/manual first sequence with honest status.

- Source: D-09, D-19, D-29, D-39, D-69, D-98.
- Owner phases: [P13](13-planning-jobs-forecast-storage.md), [P14](14-route-policy-manual-fallback.md).
- Follow-through: [P15](15-round-start-departure-lock.md), [P28](28-online-preparation-journeys.md), [P34](34-ordered-replay-conflict-recovery.md).

### R-29

**Workday/round carryover.** Multiple rounds, explicit End day across midnight, unfinished held work/deferrals retained without ERP resubmission. Closure is not delivery/receipt/settlement.

- Source: D-08, D-21, D-67.
- Owner phases: [P19](19-workday-closure-carryover.md).
- Follow-through: [P22](22-branch-interruption-redispatch.md), [P31](31-driver-branch-closure-ui.md), [P34](34-ordered-replay-conflict-recovery.md), [P36](36-workday-timing-reports.md).

### R-30

**No-answer without call counters.** Simple no-answer outcome and ordinary automatic attempt history. Remove all three-call counters/limits/reset/manual-call logging; do not infer fee refusal/arrival.

- Source: D-20, D-31, D-50, D-64, D-65.
- Owner phases: [P17](17-outcomes-quantities-collection.md).
- Follow-through: [P18](18-deferral-retry-driver-urgency.md), [P29](29-ordinary-driver-delivery-ui.md), [P42](42-final-contract-readiness-handoff.md).

### R-31

**Bounded whole retry.** Same driver may explicitly retry untouched whole return-required work still held before receipt, with history/capacity/collection validation. No automatic retries or arbitrary attempt cap.

- Source: D-49, D-65, D-79.
- Owner phases: [P18](18-deferral-retry-driver-urgency.md).
- Follow-through: [P21](21-source-return-receipt.md), [P22](22-branch-interruption-redispatch.md), [P30](30-driver-exception-correction-ui.md).

### R-32

**Source-branch return request.** Request items by originating branch only; request is not actual receipt or available stock. No B2C returns.

- Source: D-21, D-32, D-42.
- Owner phases: [P21](21-source-return-receipt.md).
- Follow-through: [P22](22-branch-interruption-redispatch.md), [P27](27-native-mock-erp-source.md), [P31](31-driver-branch-closure-ui.md).

### R-33

**Confirmed subset and disposition.** Relevant claimed handback waits for server-confirmed subset. No whole-offered-batch clearance gate/quota; unreceived/lost/damaged goods remain distinct and ERP-owned commercially.

- Source: D-45, D-68, D-80, D-95.
- Owner phases: [P21](21-source-return-receipt.md).
- Follow-through: [P22](22-branch-interruption-redispatch.md), [P27](27-native-mock-erp-source.md), [P31](31-driver-branch-closure-ui.md).

### R-34

**Native ERP receipt and actor.** Staff receipt happens in native ERP per-driver pending request screen, through bound actor commands and durable source intent. No compulsory duplicate Tawsel receiver screen.

- Source: D-44, D-84, D-95.
- Owner phases: [P08](08-erp-provisioning-actor-binding.md), [P21](21-source-return-receipt.md).
- Follow-through: [P27](27-native-mock-erp-source.md), [P31](31-driver-branch-closure-ui.md), [P42](42-final-contract-readiness-handoff.md).

### R-35

**Branch interruption.** Pause heading customer, resolve arrived/handled customer, retain visible customer sequence, branch service then resume/replan. Proposed full-capacity segment never exceeds active limit or splits incoming batches.

- Source: D-32, D-43, D-66, D-68.
- Owner phases: [P22](22-branch-interruption-redispatch.md).
- Follow-through: [P31](31-driver-branch-closure-ui.md), [P41](41-device-owner-pilot-review.md).

### R-36

**Redispatch after actual return.** No direct driver transfer; compatible confirmed source return permits a new cycle with old identity/history retained. Old-cycle actions cannot revive quantities.

- Source: D-22, D-34, D-95.
- Owner phases: [P22](22-branch-interruption-redispatch.md).
- Follow-through: [P23](23-bounded-driver-corrections.md), [P27](27-native-mock-erp-source.md), [P41](41-device-owner-pilot-review.md).

### R-37

**Driver self-correction.** Open workday/current owner before dependent receipt/redispatch; append original/corrected history, recompute exact effective quantities/amounts/events. No staff override, price edit or arbitrary refund.

- Source: D-73, D-91, D-96.
- Owner phases: [P23](23-bounded-driver-corrections.md).
- Follow-through: [P30](30-driver-exception-correction-ui.md), [P34](34-ordered-replay-conflict-recovery.md), [P36](36-workday-timing-reports.md).

### R-38

**One execution owner across phones.** Both phones view same active round; explicit online takeover without old-phone approval increments generation. Retain delayed old evidence; compatible current-driver adoption only.

- Source: D-75, D-78, D-87.
- Owner phases: [P20](20-device-takeover-evidence.md).
- Follow-through: [P23](23-bounded-driver-corrections.md), [P28](28-online-preparation-journeys.md), [P31](31-driver-branch-closure-ui.md), [P34](34-ordered-replay-conflict-recovery.md).

### R-39

**Durable offline capture.** Previously started/downloaded work, account-scoped Dexie and local action+pending atomic write. Roughly 24h target, no deletion deadline; storage failure must not claim saved.

- Source: D-10, D-60, D-76, D-81.
- Owner phases: [P33](33-offline-local-capture.md).
- Follow-through: [P35](35-offline-auth-updates-ux.md), [P41](41-device-owner-pilot-review.md).

### R-40

**Ordered replay/evidence receipt.** Stable action identity, dependency order, coordinated tabs and durable local ack. Received/rejected/review evidence distinct from accepted state; no client-time winner or route-only rejection.

- Source: D-10, D-61, D-87.
- Owner phases: [P34](34-ordered-replay-conflict-recovery.md).
- Follow-through: [P20](20-device-takeover-evidence.md), [P23](23-bounded-driver-corrections.md), [P35](35-offline-auth-updates-ux.md), [P41](41-device-owner-pilot-review.md).

### R-41

**Reauth and safe account exit.** Same-account recovery preserves pending work; deliberate logout/switch waits for sync. Server-durable evidence permits exit even if business rejected; no other-account cache leak or auth bypass.

- Source: D-27, D-61, D-83.
- Owner phases: [P35](35-offline-auth-updates-ux.md).
- Follow-through: [P07](07-oidc-login-recovery-sessions.md), [P33](33-offline-local-capture.md), [P34](34-ordered-replay-conflict-recovery.md), [P41](41-device-owner-pilot-review.md).

### R-42

**Safe PWA updates.** Self-host assets, safe service-worker activation and versioned local/server old-action compatibility. No pending-data purge or universal background/eviction guarantee.

- Source: D-60, D-76.
- Owner phases: [P33](33-offline-local-capture.md), [P35](35-offline-auth-updates-ux.md).
- Follow-through: [P39](39-deployment-migration-release.md), [P41](41-device-owner-pilot-review.md).

### R-43

**Cross-resource isolation.** Tenant/branch/driver/integration enforcement across reads, commands, jobs, events, cached data and exports; mixed-source totals/current/next must not leak hidden work.

- Source: D-02, D-25, D-90.
- Owner phases: [P06](06-tenant-capabilities-isolation.md).
- Follow-through: [P08](08-erp-provisioning-actor-binding.md), [P24](24-coherent-monitoring-api.md), [P26](26-mock-inbox-projection-recovery.md), [P32](32-monitoring-sync-online-ui.md), [P33](33-offline-local-capture.md), [P37](37-authorized-excel-export.md).

### R-44

**Coherent operational view.** One coherent snapshot for progress/current/next/held/prepared/history with nonregressing revision and conditional reads. Idle is not offline; unsent phone actions are not server knowledge.

- Source: D-12, D-24, D-62.
- Owner phases: [P24](24-coherent-monitoring-api.md).
- Follow-through: [P32](32-monitoring-sync-online-ui.md), [P38](38-diagnostics-freshness-capacity.md).

### R-45

**Freshness and stale recovery.** Initial visible polling 1s/one in-flight and proposed stale 10s, full reconnect refresh. Measure healthy p95 ≤3s Tawsel/≤5s ERP applied with load/errors/clock uncertainty.

- Source: D-12, D-62.
- Owner phases: [P32](32-monitoring-sync-online-ui.md), [P38](38-diagnostics-freshness-capacity.md).
- Follow-through: [P24](24-coherent-monitoring-api.md), [P25](25-outbox-signed-delivery.md), [P26](26-mock-inbox-projection-recovery.md), [P41](41-device-owner-pilot-review.md).

### R-46

**Durable sender.** Short leases/recovery/send outside transaction/stable event IDs, ordered recipient streams, bounded jittered retry and retained unresolved failures; one receiver cannot stall another.

- Source: D-13.
- Owner phases: [P25](25-outbox-signed-delivery.md).
- Follow-through: [P26](26-mock-inbox-projection-recovery.md), [P38](38-diagnostics-freshness-capacity.md), [P40](40-backup-restore-rehearsal.md).

### R-47

**Signed scoped events.** Exact-byte signature, scoped rotated secret/key ID/fresh retry timestamp; recipient/version checks, replay protection and destination controls; logs omit sensitive payloads.

- Source: D-13.
- Owner phases: [P25](25-outbox-signed-delivery.md), [P26](26-mock-inbox-projection-recovery.md).
- Follow-through: [P38](38-diagnostics-freshness-capacity.md), [P42](42-final-contract-readiness-handoff.md).

### R-48

**Durable receiver projection.** Separate ERP database/inbox; durable receipt before ack; projection+processed marker transaction; duplicates do not repeat effects and received differs from applied.

- Source: D-13.
- Owner phases: [P26](26-mock-inbox-projection-recovery.md).
- Follow-through: [P27](27-native-mock-erp-source.md), [P38](38-diagnostics-freshness-capacity.md), [P40](40-backup-restore-rehearsal.md).

### R-49

**Gap/replay/reconciliation.** Separate business transitions and replacement snapshots; per-recipient gaps/replay/checkpoints, explicit retention/expired-history limits. No fabricated historical financial recovery.

- Source: D-13.
- Owner phases: [P26](26-mock-inbox-projection-recovery.md).
- Follow-through: [P25](25-outbox-signed-delivery.md), [P34](34-ordered-replay-conflict-recovery.md), [P42](42-final-contract-readiness-handoff.md).

### R-50

**ERP source outbox.** Source change and outgoing intent commit in ERP-local transaction; retry stable IDs and show pending/rejected/accepted source state. No cross-database ACID fiction.

- Source: D-13, D-14.
- Owner phases: [P27](27-native-mock-erp-source.md).
- Follow-through: [P08](08-erp-provisioning-actor-binding.md), [P10](10-b2b-intake-admission.md), [P21](21-source-return-receipt.md), [P42](42-final-contract-readiness-handoff.md).

### R-51

**Real B2C and labelled B2B mock.** Real independent pilot plus private clearly labelled B2B mock on published contracts/separate storage; production shipping ERP connector remains separate work.

- Source: D-13, D-85.
- Owner phases: [P26](26-mock-inbox-projection-recovery.md), [P27](27-native-mock-erp-source.md).
- Follow-through: [P41](41-device-owner-pilot-review.md), [P42](42-final-contract-readiness-handoff.md).

### R-52

**Results/amount report.** Explicit workday/filter snapshot, separate delivered/partial/failed/processed/held/received units, repeated attempts not new shipments; recorded collections not remitted cash.

- Source: D-08, D-24, D-26, D-67, D-89, D-100.
- Owner phases: [P36](36-workday-timing-reports.md).
- Follow-through: [P17](17-outcomes-quantities-collection.md), [P19](19-workday-closure-carryover.md), [P23](23-bounded-driver-corrections.md), [P37](37-authorized-excel-export.md).

### R-53

**Forecast versus actual.** Persist initial/revised forecast/workload early; compare matching per-stop/round action actuals, missing/uncertain clocks and changed scope/early end honestly. No GPS or ranking.

- Source: D-82, D-88.
- Owner phases: [P13](13-planning-jobs-forecast-storage.md), [P15](15-round-start-departure-lock.md), [P36](36-workday-timing-reports.md).
- Follow-through: [P16](16-current-heading-arrival.md), [P19](19-workday-closure-carryover.md), [P33](33-offline-local-capture.md), [P37](37-authorized-excel-export.md).

### R-54

**Equivalent Excel.** Real .xlsx matches authorized report snapshot/filters/units/timezone; literal user text, creation+download authorization and artifact expiry.

- Source: D-100.
- Owner phases: [P37](37-authorized-excel-export.md).
- Follow-through: [P36](36-workday-timing-reports.md), [P41](41-device-owner-pilot-review.md).

### R-55

**Visual hierarchy authority.** Nine source sets are layout/design references; decisions define operations. Add/remove/adapt coherently and cover required extensions, no nine-page limit.

- Source: D-102.
- Owner phases: [P03](03-design-action-specification.md).
- Follow-through: [P04](04-representative-ui-review.md), [P11](11-locations-map-assets.md), [P28](28-online-preparation-journeys.md), [P29](29-ordinary-driver-delivery-ui.md), [P30](30-driver-exception-correction-ui.md), [P31](31-driver-branch-closure-ui.md), [P32](32-monitoring-sync-online-ui.md), [P36](36-workday-timing-reports.md), [P41](41-device-owner-pilot-review.md).

### R-56

**Accepted technology/components.** React/TS/Vite, Fastify, PostgreSQL, OIDC/Keycloak, MapLibre/PMTiles, shadcn+Smooth; shared tokens and actual component APIs. Pin compatible versions during implementation.

- Source: D-103, D-104, D-107.
- Owner phases: [P01](01-workspace-test-harness.md), [P03](03-design-action-specification.md), [P04](04-representative-ui-review.md).
- Follow-through: [P05](05-postgres-atomic-command-kernel.md), [P07](07-oidc-login-recovery-sessions.md), [P11](11-locations-map-assets.md), [P39](39-deployment-migration-release.md).

### R-57

**Very simple driver UX.** Obvious purpose/next action/missing/waiting, one dominant stage action and contextual controls. Focused pages/sheets, preserved input, no nested dialogs/clerical confirmations.

- Source: D-41, D-106.
- Owner phases: [P03](03-design-action-specification.md), [P04](04-representative-ui-review.md).
- Follow-through: [P07](07-oidc-login-recovery-sessions.md), [P09](09-b2c-task-intake.md), [P11](11-locations-map-assets.md), [P28](28-online-preparation-journeys.md), [P29](29-ordinary-driver-delivery-ui.md), [P30](30-driver-exception-correction-ui.md), [P31](31-driver-branch-closure-ui.md), [P32](32-monitoring-sync-online-ui.md), [P35](35-offline-auth-updates-ux.md), [P36](36-workday-timing-reports.md), [P41](41-device-owner-pilot-review.md).

### R-58

**Meaningful connected Vitest.** Real scenario files alongside features; PostgreSQL for ACID/concurrency, actual sender/receiver boundary, queue-to-API and component/client tests. No empty pass-only placeholders.

- Source: D-105.
- Owner phases: [P01](01-workspace-test-harness.md), [P05](05-postgres-atomic-command-kernel.md).
- Follow-through: [P06](06-tenant-capabilities-isolation.md), [P10](10-b2b-intake-admission.md), [P14](14-route-policy-manual-fallback.md), [P15](15-round-start-departure-lock.md), [P17](17-outcomes-quantities-collection.md), [P21](21-source-return-receipt.md), [P23](23-bounded-driver-corrections.md), [P26](26-mock-inbox-projection-recovery.md), [P29](29-ordinary-driver-delivery-ui.md), [P34](34-ordered-replay-conflict-recovery.md), [P37](37-authorized-excel-export.md), [P42](42-final-contract-readiness-handoff.md).

### R-59

**Browser/device/accessibility.** Playwright interactions and visual evidence distinct from fixtures; Android/Chrome and iPhone/Safari, RTL/focus/reduced motion/zoom/safe areas and real elapsed offline observation.

- Source: D-76.
- Owner phases: [P04](04-representative-ui-review.md), [P41](41-device-owner-pilot-review.md).
- Follow-through: [P07](07-oidc-login-recovery-sessions.md), [P11](11-locations-map-assets.md), [P28](28-online-preparation-journeys.md), [P29](29-ordinary-driver-delivery-ui.md), [P30](30-driver-exception-correction-ui.md), [P31](31-driver-branch-closure-ui.md), [P32](32-monitoring-sync-online-ui.md), [P33](33-offline-local-capture.md), [P35](35-offline-auth-updates-ux.md), [P36](36-workday-timing-reports.md), [P37](37-authorized-excel-export.md).

### R-60

**Safe deployment.** KVM2/Dokploy target inventory, TLS/private Engine+DB, pinned reproducible images/secrets/migrations and old-PWA compatibility. Preserve datasets; no ordinary app-triggered import.

- Source: D-77, D-86.
- Owner phases: [P39](39-deployment-migration-release.md).
- Follow-through: [P01](01-workspace-test-harness.md), [P07](07-oidc-login-recovery-sessions.md), [P11](11-locations-map-assets.md), [P35](35-offline-auth-updates-ux.md), [P40](40-backup-restore-rehearsal.md).

### R-61

**Owner diagnosis and headroom.** Owner can reproduce problems and inspect bottlenecks; measured 5-driver/2-observer baseline then ramp, not hard capacity cap or compulsory server upgrade.

- Source: D-63, D-86.
- Owner phases: [P38](38-diagnostics-freshness-capacity.md).
- Follow-through: [P39](39-deployment-migration-release.md), [P41](41-device-owner-pilot-review.md).

### R-62

**Backup/restore.** Proposed RPO≤15m/RTO≤4h server data through separate failure-domain backup/WAL and timed isolated checkpoint restore, plus identity/secrets and separate Engine artifacts.

- Source: original architecture/integration requirements; master-plan sections 10/17/18, with operational targets still proposed.
- Owner phases: [P40](40-backup-restore-rehearsal.md).
- Follow-through: [P39](39-deployment-migration-release.md), [P41](41-device-owner-pilot-review.md), [P42](42-final-contract-readiness-handoff.md).

### R-63

**Explicit exclusions/future boundaries.** No V1 billing/gates, GPS/native/learning/incentives/POD/call counter/financial settlement/fleet allocator. Preserve future boundary notes without empty speculative modules.

- Source: D-11, D-28, D-38, D-54, D-64, D-76.
- Owner phases: [P02](02-state-contract-foundation.md).
- Follow-through: [P03](03-design-action-specification.md), [P09](09-b2c-task-intake.md), [P17](17-outcomes-quantities-collection.md), [P27](27-native-mock-erp-source.md), [P42](42-final-contract-readiness-handoff.md).

### R-64

**Canonical docs and truthful handoff.** Versioned HTTP/events/examples/client, state/UI/integration/operations/report docs and exact implementation/verification ledger. The final ERP bundle includes planning input, ownership/field/status mapping, public-consumer quickstart/conformance checks and a validated release manifest. External proof starts in P26–P27; P42 audits and packages actual evidence and remaining limitations. See the [handoff deliverables plan](../planning/erp-handoff-deliverables.md).

- Source: D-13, D-108, D-111.
- Owner phases: [P02](02-state-contract-foundation.md), [P42](42-final-contract-readiness-handoff.md).
- Follow-through: [P03](03-design-action-specification.md), [P08](08-erp-provisioning-actor-binding.md), [P25](25-outbox-signed-delivery.md), [P26](26-mock-inbox-projection-recovery.md), [P27](27-native-mock-erp-source.md), [P36](36-workday-timing-reports.md), [P39](39-deployment-migration-release.md), [P40](40-backup-restore-rehearsal.md), [P41](41-device-owner-pilot-review.md), [P10](10-b2b-intake-admission.md), [P21](21-source-return-receipt.md), [P22](22-branch-interruption-redispatch.md).

### R-65

**Small self-contained sequential phases.** Replace broad 11-phase prompts with bounded increments, embedded relevant rules, ordered checkpoints and Given/expected cases; no dependency on chat memory or one-shot end-only testing. Each prompt specifies its recommended Codex model/reasoning effort and reason under D-110, with actual settings recorded at execution.

- Source: D-108, D-109, D-110.
- Owner phases: [P01](01-workspace-test-harness.md).
- Follow-through: [P02](02-state-contract-foundation.md), [P03](03-design-action-specification.md), [P04](04-representative-ui-review.md), [P05](05-postgres-atomic-command-kernel.md), [P06](06-tenant-capabilities-isolation.md), [P07](07-oidc-login-recovery-sessions.md), [P08](08-erp-provisioning-actor-binding.md), [P09](09-b2c-task-intake.md), [P10](10-b2b-intake-admission.md), [P11](11-locations-map-assets.md), [P12](12-engine-profile-adapters.md), [P13](13-planning-jobs-forecast-storage.md), [P14](14-route-policy-manual-fallback.md), [P15](15-round-start-departure-lock.md), [P16](16-current-heading-arrival.md), [P17](17-outcomes-quantities-collection.md), [P18](18-deferral-retry-driver-urgency.md), [P19](19-workday-closure-carryover.md), [P20](20-device-takeover-evidence.md), [P21](21-source-return-receipt.md), [P22](22-branch-interruption-redispatch.md), [P23](23-bounded-driver-corrections.md), [P24](24-coherent-monitoring-api.md), [P25](25-outbox-signed-delivery.md), [P26](26-mock-inbox-projection-recovery.md), [P27](27-native-mock-erp-source.md), [P28](28-online-preparation-journeys.md), [P29](29-ordinary-driver-delivery-ui.md), [P30](30-driver-exception-correction-ui.md), [P31](31-driver-branch-closure-ui.md), [P32](32-monitoring-sync-online-ui.md), [P33](33-offline-local-capture.md), [P34](34-ordered-replay-conflict-recovery.md), [P35](35-offline-auth-updates-ux.md), [P36](36-workday-timing-reports.md), [P37](37-authorized-excel-export.md), [P38](38-diagnostics-freshness-capacity.md), [P39](39-deployment-migration-release.md), [P40](40-backup-restore-rehearsal.md), [P41](41-device-owner-pilot-review.md), [P42](42-final-contract-readiness-handoff.md).

## HTTP and event family ownership

| Family | Contract/runtime owners | Important integration and evidence |
| --- | --- | --- |
| Shared IDs/errors/action/envelope/versioning | [P02](02-state-contract-foundation.md) canonical foundation | Feature owner completes schemas before handlers; [P42](42-final-contract-readiness-handoff.md) drift audit |
| Sessions/account/recovery | [P07](07-oidc-login-recovery-sessions.md) | [P35](35-offline-auth-updates-ux.md) queue-aware exit/reauth |
| Tenancy/capabilities/provisioning | [P06](06-tenant-capabilities-isolation.md), [P08](08-erp-provisioning-actor-binding.md) | [P27](27-native-mock-erp-source.md) native source UI, every resource phase extends enforcement |
| B2C task / ERP task snapshot/prepared/received/admission | [P09](09-b2c-task-intake.md), [P10](10-b2b-intake-admission.md) | [P15](15-round-start-departure-lock.md) departure race, [P27](27-native-mock-erp-source.md) source outbox, [P28](28-online-preparation-journeys.md) UI |
| Search/pin/provenance | [P11](11-locations-map-assets.md) | [P15](15-round-start-departure-lock.md) lifecycle guard, [P28](28-online-preparation-journeys.md), [P30](30-driver-exception-correction-ui.md) UI |
| Profiles/planning jobs/forecasts/manual/status | [P12](12-engine-profile-adapters.md), [P13](13-planning-jobs-forecast-storage.md), [P14](14-route-policy-manual-fallback.md) | [P15](15-round-start-departure-lock.md) first-start publication, [P28](28-online-preparation-journeys.md) UI |
| Start/current/arrival/outcomes/scheduling/day | [P15](15-round-start-departure-lock.md)–[P19](19-workday-closure-carryover.md) | [P29](29-ordinary-driver-delivery-ui.md)–[P31](31-driver-branch-closure-ui.md) UI, [P34](34-ordered-replay-conflict-recovery.md) replay |
| Device generation/status/evidence | [P20](20-device-takeover-evidence.md) | [P23](23-bounded-driver-corrections.md) adoption, [P34](34-ordered-replay-conflict-recovery.md), [P35](35-offline-auth-updates-ux.md) recovery |
| Return request/receipt/disposition/branch/redispatch | [P21](21-source-return-receipt.md), [P22](22-branch-interruption-redispatch.md) | [P27](27-native-mock-erp-source.md) native ERP UI, [P31](31-driver-branch-closure-ui.md) driver UI |
| Driver correction/effective history | [P23](23-bounded-driver-corrections.md) | [P30](30-driver-exception-correction-ui.md) UI, [P34](34-ordered-replay-conflict-recovery.md) replay, [P36](36-workday-timing-reports.md) report |
| Coherent monitoring/history | [P24](24-coherent-monitoring-api.md) | [P32](32-monitoring-sync-online-ui.md) client, [P38](38-diagnostics-freshness-capacity.md) measurement |
| Signed delivery/received/applied/replay/checkpoint | [P25](25-outbox-signed-delivery.md), [P26](26-mock-inbox-projection-recovery.md) | [P27](27-native-mock-erp-source.md) source direction, [P40](40-backup-restore-rehearsal.md) recovery |
| Sync batch/dependencies/evidence results | [P34](34-ordered-replay-conflict-recovery.md) | Reuses commands and [P33](33-offline-local-capture.md) journal, [P35](35-offline-auth-updates-ux.md) account/update |
| Report/filter/snapshot/export/download | [P36](36-workday-timing-reports.md), [P37](37-authorized-excel-export.md) | [P41](41-device-owner-pilot-review.md) connected pilot |
| Owner diagnostics/health | [P38](38-diagnostics-freshness-capacity.md) | [P39](39-deployment-migration-release.md) target deployment |

The exact operation/event IDs live in docs/contract-coverage.md created by P02. No feature phase may substitute a private UI-only endpoint or count a designed schema as an implemented handler.

## Visual references and required extensions

All paths are under stitch-export/screens/. Each directory has code.html and metadata.json; 01–03 use screen.jpg, 04–09 screen.png.
P03 inventories every source; P41 reviews the complete adapted product.

| Directory | Functional phases |
| --- | --- |
| 01-active-driver-trip | [P04](04-representative-ui-review.md), [P11](11-locations-map-assets.md), [P16](16-current-heading-arrival.md), [P28](28-online-preparation-journeys.md), [P29](29-ordinary-driver-delivery-ui.md), [P30](30-driver-exception-correction-ui.md), [P31](31-driver-branch-closure-ui.md), [P33](33-offline-local-capture.md), [P34](34-ordered-replay-conflict-recovery.md), [P35](35-offline-auth-updates-ux.md), [P41](41-device-owner-pilot-review.md) |
| 02-stop-details | [P04](04-representative-ui-review.md), [P16](16-current-heading-arrival.md), [P17](17-outcomes-quantities-collection.md), [P18](18-deferral-retry-driver-urgency.md), [P23](23-bounded-driver-corrections.md), [P29](29-ordinary-driver-delivery-ui.md), [P30](30-driver-exception-correction-ui.md), [P33](33-offline-local-capture.md), [P35](35-offline-auth-updates-ux.md), [P41](41-device-owner-pilot-review.md) |
| 03-dispatcher-workspace | [P04](04-representative-ui-review.md), [P24](24-coherent-monitoring-api.md), [P32](32-monitoring-sync-online-ui.md), [P36](36-workday-timing-reports.md), [P38](38-diagnostics-freshness-capacity.md), [P41](41-device-owner-pilot-review.md) |
| 04-login-workspace | [P04](04-representative-ui-review.md), [P07](07-oidc-login-recovery-sessions.md), [P28](28-online-preparation-journeys.md), [P35](35-offline-auth-updates-ux.md), [P41](41-device-owner-pilot-review.md) |
| 05-driver-daily-trips | [P04](04-representative-ui-review.md), [P19](19-workday-closure-carryover.md), [P28](28-online-preparation-journeys.md), [P31](31-driver-branch-closure-ui.md), [P35](35-offline-auth-updates-ux.md), [P36](36-workday-timing-reports.md), [P41](41-device-owner-pilot-review.md) |
| 06-route-preparation | [P09](09-b2c-task-intake.md), [P10](10-b2b-intake-admission.md), [P11](11-locations-map-assets.md), [P14](14-route-policy-manual-fallback.md), [P28](28-online-preparation-journeys.md), [P41](41-device-owner-pilot-review.md) |
| 07-location-review | [P11](11-locations-map-assets.md), [P28](28-online-preparation-journeys.md), [P30](30-driver-exception-correction-ui.md), [P41](41-device-owner-pilot-review.md) |
| 08-trip-completion | [P19](19-workday-closure-carryover.md), [P31](31-driver-branch-closure-ui.md), [P36](36-workday-timing-reports.md), [P37](37-authorized-excel-export.md), [P41](41-device-owner-pilot-review.md) |
| 09-sync-conflicts | [P20](20-device-takeover-evidence.md), [P23](23-bounded-driver-corrections.md), [P32](32-monitoring-sync-online-ui.md), [P33](33-offline-local-capture.md), [P34](34-ordered-replay-conflict-recovery.md), [P35](35-offline-auth-updates-ux.md), [P41](41-device-owner-pilot-review.md) |
| Added registration/recovery/fast B2C entry | [P07](07-oidc-login-recovery-sessions.md), [P09](09-b2c-task-intake.md), [P11](11-locations-map-assets.md), [P28](28-online-preparation-journeys.md), [P35](35-offline-auth-updates-ux.md) |
| Added partial/refusal/deferral/retry/urgency/correction | [P17](17-outcomes-quantities-collection.md), [P18](18-deferral-retry-driver-urgency.md), [P23](23-bounded-driver-corrections.md), [P30](30-driver-exception-correction-ui.md) |
| Added branch/subset/closure/takeover | [P19](19-workday-closure-carryover.md), [P20](20-device-takeover-evidence.md), [P21](21-source-return-receipt.md), [P22](22-branch-interruption-redispatch.md), [P27](27-native-mock-erp-source.md), [P31](31-driver-branch-closure-ui.md) |
| Added timing/Excel and operator diagnostics | [P36](36-workday-timing-reports.md), [P37](37-authorized-excel-export.md), [P38](38-diagnostics-freshness-capacity.md) |

The native mock ERP has its own minimal source/admin/receipt surfaces in P27. It is not one of the nine Tawsel exports and must not force a duplicate staff receipt page into Tawsel.

## Named Vitest ownership

Suggested canonical paths from master-plan section 18 remain valid; use an actual documented equivalent if repository conventions differ.

| File | First meaningful implementation | Extensions |
| --- | --- | --- |
| apps/api/test/integration/authorization-isolation.test.ts | [P06](06-tenant-capabilities-isolation.md) | Provisioning [P08](08-erp-provisioning-actor-binding.md), domain phases, mixed source [P24](24-coherent-monitoring-api.md), export [P37](37-authorized-excel-export.md) |
| apps/api/test/integration/planning-publication.test.ts | [P13](13-planning-jobs-forecast-storage.md) | Complete route policy [P14](14-route-policy-manual-fallback.md), start [P15](15-round-start-departure-lock.md), current [P16](16-current-heading-arrival.md), branch [P22](22-branch-interruption-redispatch.md) |
| apps/api/test/integration/start-assignment-race.test.ts | [P15](15-round-start-departure-lock.md) | Admission [P10](10-b2b-intake-admission.md), queue-to-start [P34](34-ordered-replay-conflict-recovery.md) |
| apps/api/test/integration/outcome-progress-outbox.test.ts | [P17](17-outcomes-quantities-collection.md) | Receipt [P21](21-source-return-receipt.md), correction [P23](23-bounded-driver-corrections.md), transport [P26](26-mock-inbox-projection-recovery.md) |
| apps/api/test/integration/partial-return-correction.test.ts | [P21](21-source-return-receipt.md) | Redispatch [P22](22-branch-interruption-redispatch.md), correction races [P23](23-bounded-driver-corrections.md), report [P36](36-workday-timing-reports.md) |
| tests/integration/outbox-inbox-recovery.test.ts | [P25](25-outbox-signed-delivery.md) sender side | [P26](26-mock-inbox-projection-recovery.md) full separate-DB receiver, [P27](27-native-mock-erp-source.md) source direction, [P40](40-backup-restore-rehearsal.md) restore |
| tests/integration/offline-device-takeover.test.ts | [P34](34-ordered-replay-conflict-recovery.md) actual queue/API | Generation source [P20](20-device-takeover-evidence.md), local stores [P33](33-offline-local-capture.md), sessions/update [P35](35-offline-auth-updates-ux.md), devices [P41](41-device-owner-pilot-review.md) |
| apps/web/src/features/execution/driver-flow.test.tsx | [P04](04-representative-ui-review.md) labelled component fixtures | Actual API UI [P29](29-ordinary-driver-delivery-ui.md), exceptions [P30](30-driver-exception-correction-ui.md), branch [P31](31-driver-branch-closure-ui.md), offline [P33](33-offline-local-capture.md)–[P35](35-offline-auth-updates-ux.md) |

Every phase also names its focused tests. P02/P03 specification work is labelled as such; do not fabricate application/browser tests for documents. All important connected tests arrive with the behavior, not as empty filenames or a final catch-all suite.

## Acceptance groups A–P

| Group | Primary owners / evidence | Observable acceptance |
| --- | --- | --- |
| A — Real B2C journey | [P07](07-oidc-login-recovery-sessions.md), [P09](09-b2c-task-intake.md), [P11](11-locations-map-assets.md), [P14](14-route-policy-manual-fallback.md), [P15](15-round-start-departure-lock.md), [P17](17-outcomes-quantities-collection.md), [P28](28-online-preparation-journeys.md), [P29](29-ordinary-driver-delivery-ui.md), [P33](33-offline-local-capture.md), [P34](34-ordered-replay-conflict-recovery.md), [P36](36-workday-timing-reports.md), [P37](37-authorized-excel-export.md) | Real sessions/tasks/Engine + browser/device journey, not fixture success |
| B — B2B boundary | [P08](08-erp-provisioning-actor-binding.md), [P10](10-b2b-intake-admission.md), [P21](21-source-return-receipt.md), [P25](25-outbox-signed-delivery.md), [P26](26-mock-inbox-projection-recovery.md), [P27](27-native-mock-erp-source.md) | Native mock → API → execution → signed durable projection |
| C — Admission and authority | [P06](06-tenant-capabilities-isolation.md), [P10](10-b2b-intake-admission.md), [P15](15-round-start-departure-lock.md), [P18](18-deferral-retry-driver-urgency.md) | Atomic batch/start race and departed staff denial |
| D — Execution | [P16](16-current-heading-arrival.md), [P17](17-outcomes-quantities-collection.md), [P18](18-deferral-retry-driver-urgency.md), [P19](19-workday-closure-carryover.md), [P20](20-device-takeover-evidence.md), [P22](22-branch-interruption-redispatch.md), [P29](29-ordinary-driver-delivery-ui.md), [P30](30-driver-exception-correction-ui.md), [P31](31-driver-branch-closure-ui.md) | Explicit stage/current, eligibility, branch and single owner |
| E — Quantities and money | [P10](10-b2b-intake-admission.md), [P17](17-outcomes-quantities-collection.md), [P23](23-bounded-driver-corrections.md), [P36](36-workday-timing-reports.md) | Exact examples, prepaid/fees and quantity conservation |
| F — Returns and correction | [P21](21-source-return-receipt.md), [P22](22-branch-interruption-redispatch.md), [P23](23-bounded-driver-corrections.md), [P27](27-native-mock-erp-source.md), [P30](30-driver-exception-correction-ui.md), [P31](31-driver-branch-closure-ui.md) | Subset confirmation, no whole gate, dependency races |
| G — Atomicity | [P05](05-postgres-atomic-command-kernel.md), [P10](10-b2b-intake-admission.md), [P15](15-round-start-departure-lock.md), [P17](17-outcomes-quantities-collection.md), [P21](21-source-return-receipt.md), [P23](23-bounded-driver-corrections.md) | Real commit/rollback and independent-connection evidence |
| H — Durable synchronization | [P25](25-outbox-signed-delivery.md), [P26](26-mock-inbox-projection-recovery.md), [P27](27-native-mock-erp-source.md), [P34](34-ordered-replay-conflict-recovery.md) | Crash/lost response/duplicates/gaps and recovery |
| I — Offline and device | [P20](20-device-takeover-evidence.md), [P33](33-offline-local-capture.md), [P34](34-ordered-replay-conflict-recovery.md), [P35](35-offline-auth-updates-ux.md), [P41](41-device-owner-pilot-review.md) | Actual storage/reopen/takeover/update and elapsed observation |
| J — Planning failure | [P12](12-engine-profile-adapters.md), [P13](13-planning-jobs-forecast-storage.md), [P14](14-route-policy-manual-fallback.md), [P15](15-round-start-departure-lock.md), [P22](22-branch-interruption-redispatch.md), [P28](28-online-preparation-journeys.md) | Complete result validation, stale rejection and manual fallback |
| K — Monitoring | [P24](24-coherent-monitoring-api.md), [P25](25-outbox-signed-delivery.md), [P26](26-mock-inbox-projection-recovery.md), [P32](32-monitoring-sync-online-ui.md), [P38](38-diagnostics-freshness-capacity.md) | Coherent nonregressing views and measured healthy timing |
| L — Isolation | [P06](06-tenant-capabilities-isolation.md), [P08](08-erp-provisioning-actor-binding.md), [P24](24-coherent-monitoring-api.md), [P26](26-mock-inbox-projection-recovery.md), [P33](33-offline-local-capture.md), [P35](35-offline-auth-updates-ux.md), [P37](37-authorized-excel-export.md) | Reads/writes/jobs/recipient projections/cache/export |
| M — Time and reporting | [P13](13-planning-jobs-forecast-storage.md), [P15](15-round-start-departure-lock.md), [P19](19-workday-closure-carryover.md), [P33](33-offline-local-capture.md), [P36](36-workday-timing-reports.md), [P37](37-authorized-excel-export.md) | Captured forecasts, clock quality, effective matching report/export |
| N — Visual and functional coverage | [P03](03-design-action-specification.md), [P04](04-representative-ui-review.md), [P07](07-oidc-login-recovery-sessions.md), [P11](11-locations-map-assets.md), [P27](27-native-mock-erp-source.md), [P28](28-online-preparation-journeys.md), [P29](29-ordinary-driver-delivery-ui.md), [P30](30-driver-exception-correction-ui.md), [P31](31-driver-branch-closure-ui.md), [P32](32-monitoring-sync-online-ui.md), [P35](35-offline-auth-updates-ux.md), [P36](36-workday-timing-reports.md), [P37](37-authorized-excel-export.md), [P41](41-device-owner-pilot-review.md) | All references and required extensions, real interactions |
| O — Operations | [P38](38-diagnostics-freshness-capacity.md), [P39](39-deployment-migration-release.md), [P40](40-backup-restore-rehearsal.md) | Preserved Engine, safe deploy/release and timed restore |
| P — Driver simplicity | [P03](03-design-action-specification.md), [P04](04-representative-ui-review.md), [P28](28-online-preparation-journeys.md), [P29](29-ordinary-driver-delivery-ui.md), [P30](30-driver-exception-correction-ui.md), [P31](31-driver-branch-closure-ui.md), [P35](35-offline-auth-updates-ux.md), [P36](36-workday-timing-reports.md), [P41](41-device-owner-pilot-review.md) | Purpose/next action/blocker/waiting obvious; actual owner findings |

P41 walks through the product/device evidence and P42 audits the final mapping. They do not manufacture missing tests or waive earlier failures.

## Documentation and artifact ownership

| Artifact | Creation / maintenance responsibility |
| --- | --- |
| README.md / .env.example / workspace and CI | 01; updated every implemented configuration phase |
| contracts/openapi.yaml / contracts/events / contracts/examples / generated reference/client | 02 common foundation and complete operation inventory; each owning feature phase completes its precise schemas before handlers |
| docs/contract-coverage.md | 02; exact operation/event designed/implemented/verified status updated every feature phase |
| docs/tracking-and-consistency.md | 02 complete state/invariant design; 05–26 and 33–35 maintain as-built details |
| DESIGN.md / docs/ui-spec.md | 03; reused/updated by all UI phases without invented nine-page restriction |
| docs/ui-review.md | 04; actual screenshot/interaction/owner feedback extended by later UI phases |
| docs/integration-guide.md | 02 initial contract obligations; 08, 10, 21, 25–27 verified setup/protocol/native flows |
| docs/verification/integration.md | 26; 27 extends source outbox/native demonstration |
| docs/reporting.md | 36; 37 records exact workbook/snapshot behavior |
| docs/operations.md | 01 substantive workspace setup; extended with DB/identity/maps/workers/updates, completed by 38–40 |
| docs/verification/performance.md | 38 measured environment/workload/freshness and bottlenecks |
| docs/verification/deployment.md | 39 real staging/target release and migration evidence |
| docs/verification/restore.md | 40 timed isolated restore and checkpoint evidence |
| docs/verification/pilot-readiness.md | 41 actual device/owner/A–P results; 42 final readiness with unresolved conditions |
| docs/erp/README.md / ERP-PLANNING-INPUT.md / field-and-status-mapping.md | 02 meaningful designed foundation; 08, 10, 21–27 actual identities/source/receipt/event mapping; 42 final ERP planning bundle |
| docs/erp/consumer-quickstart.md / tests/erp-conformance/ | 26 receiver setup/checks; 27 complete two-way public-only setup/reference consumer; 42 clean final-release run |
| docs/ERP-INTEGRATION-HANDOFF.md / docs/erp/release-manifest.json | 42 as-built released boundary, actual artifact versions/paths/digests, evidence and real-connector obligations |
| docs/phases/model-selection.md / docs/planning/erp-handoff-deliverables.md | Current planning guidance under D-110/D-111; update recommendations and responsibilities coherently if facts change |
| docs/implementation-status.md | Existing execution ledger, now reset only in the sense that all phases were never started; each task appends actual evidence |

These are future deliverables until their owning phase produces substantive content. Exact implementation paths may follow verified repository conventions; update this map and callers coherently rather than keeping broken aliases.

## Data creation order and dependency traps

- P05 establishes shared idempotency/audit/outbox before the first accepted business change. A sender arriving in P25 does not excuse missing event intent in P08/P10.
- P06 creates memberships/permissions; P07 binds actual sessions; P08 binds trusted ERP actors. A role selector is never an identity grant.
- P09/P10 create task/cycle/source snapshots; P11 preserves pin provenance. P13 captures plan/forecast revisions; P15 freezes the initial start baseline. P36 must not reconstruct historical expectations.
- P15–P20 establish workday/round/attempt/quantities/device/evidence. P21–P23 add receipt/disposition/correction dependencies under shared locks.
- P25/P26 implement actual sender/receiver transport on top of earlier durable domain intent. P27's separate source database needs its own command outbox.
- P33 adds local durable journal/pending projection; P34 reuses existing authoritative commands for replay; P35 adds safe account/update recovery. No parallel offline business state machine.
- P36/P37 derive reports/artifacts from accepted facts. They do not create a financial settlement ledger.
- P39 completes target deployment only when its backup/recovery prerequisites are actually met; P40 provides the full timed recovery evidence. Otherwise target release remains explicitly pending.

Initial deployment placeholders for domain/TLS/email/backup/map coverage are not invented values or readiness evidence.

