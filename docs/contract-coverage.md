# Canonical operation ownership and coverage

Generated from [contracts/operations.json](../contracts/operations.json) by `npm run contracts:generate`.

**P07–P27 session/context, provisioning, intake, locations, routing metadata, durable planning, online start, current/arrival, exact outcomes, explicit eligibility transitions and workday closure/carry-forward are implemented locally; each row records its actual lifecycle.** P20 online takeover, snapshot fencing and retained evidence are locally verified; P21 source-branch return receipt/disposition and public consumer proof are locally verified; P22 branch/new-cycle dependencies and P23 correction/adoption are locally verified; P25 signed delivery/status/retry/replay are locally verified; P26 external application and P27 native source durability/two-way conformance are locally verified. [Identity setup/evidence](identity.md) identifies application HTTP paths versus issuer-hosted actions. No generic CRUD endpoint replaces explicit actions.

`designed` means specification only; `implemented` requires an actual handler/producer; `verified-local` additionally requires recorded local evidence. Neither means deployed or interoperable with a real ERP. Events are produced by the feature owner listed; P25 transports committed intent and P26 verifies the external receiver.

P05/P06 foundations: PostgreSQL command/retention and tenant/capability/resource authorization are verified internally. The catalog authorizationFoundation records the P06 evidence and canonical shared schemas. P20 action.getResult now covers scoped round execution/takeover records; other feature results keep their adapters: P09 command retries return their retained scoped result through the same feature endpoint. P07 supplies session authentication; every adapter rechecks resource visibility before disclosure. P08 promotes provisioning commands and provisioning.changed; P09 promotes independent intake commands/reads and local task intake events. P10 promotes source snapshots, preparation, receipt/admission, predeparture updates and source-scoped reads/results, with durable event/replan intent. P11 promotes scoped original/pin snapshots, private candidate search, confirmation, map configuration and durable location intent. Actual private Nominatim is unavailable; actual map/browser rendering is locally verified. Delivery remains P25. See [P05 evidence](phase-05-evidence.md), [P06 evidence](phase-06-evidence.md) and [permission contract/guard inputs](authorization.md).

P12 verifies authenticated profile metadata and internal OSRM route/table plus VROOM candidate adapters against controlled HTTP fixtures. Canonical routing schemas/types and [boundary evidence](phase-12-evidence.md) distinguish complete/partial/error, units and service estimates. Live Engine unavailable; jobs/publication/urgency remain P13/P14.

P13 now verifies durable planning/status/history APIs, atomic intake/pin triggers, fenced worker recovery and immutable candidate/forecast/workload storage. plan.revisionPublished is a source-scoped draft identity intent, not an active round or delivered ERP fact. [Runbook](planning-jobs.md) and [evidence](phase-13-evidence.md) identify controlled providers and actual PostgreSQL/HTTP/process proof. P14 now verifies grouped urgent/current policy, complete validation and revisioned manual fallback; P15 now verifies online start, first baseline, departure/admission guards and same-action recovery. See [start contract/demo](round-start.md) and [P15 evidence](phase-15-evidence.md). See [P14 policy](route-policy.md) and [evidence](phase-14-evidence.md).

Operation IDs are stable protocol identifiers, not live URLs. Paths/methods are intentionally unassigned until their owner defines a complete operation. Local UI actions invoke no business mutation by themselves; internal-work rows are not public endpoints. The external consumer/source rows belong to the separate ERP process.

[UI action coverage](ui-actions.md) maps every catalog entry to role/state, page or focused overlay, feedback and connected UI phase. [UI specification](ui-spec.md) and [reference audit](ui-reference-audit.md) define requirement-driven additions/removals and Arabic state acceptance. These are designed surfaces, not working endpoints or browser evidence; [Phase 03 evidence](phase-03-evidence.md) records the document checks.

The Capability column names the scoped capability family. For own-driver reads, planning and locations, `execution.own` is an explicit server-policy alternative to staff `monitor.read`, `planning.manage` or `location.review`, constrained to that driver’s authorized work. Predeparture staff authority never implies postdeparture execution authority. `authenticated`, `public`, `local`, `internal`, `external-consumer` and `recipient-scope` denote boundary contexts, not configurable role grants. P06 implements reusable enforcement; P07 establishes real authentication; P08 implements explicitly permitted provisioning service operations; P09 applies personal-tenant and predeparture predicates; P10 composes service credentials and current source/branch guards in the same transaction. Each later feature supplies its locked lifecycle predicates. The [permission table](authorization.md) and [authority tables](tracking-and-consistency.md) remain binding.

## Master-plan family review

| Master plan §13 family | Catalog family | Review result / additional owners |
| --- | --- | --- |
| Session/context | session-context | Company resolution, separate identity, recovery/status, effective context, refresh/logout; P35 queue-safe exit |
| Integration provisioning | integration-provisioning | Source binding/rotation/disable, branches, users, role/overrides/memberships, driver and issuer status |
| Intake | intake | Independent intake plus source snapshot, prepared/received batch, withdraw/reassign and predeparture urgency |
| Locations | locations | Candidate search, original/pin/provenance reads and confirmation; public coordinates never Engine arrays |
| Planning | planning | Draft inputs/preview, jobs, manual plan, replan, forecast/route reads; round.start owns initial publication |
| Execution | execution | Start, heading/change/arrival, each outcome, whole deferral/retry, driver urgency, end round/day, takeover/correction/adoption |
| Returns | returns | Source groups, request/status, actual subset receipt, disposition, interruption/resume and new cycle |
| Monitoring/history | monitoring-history | Driver/trip coherent reads, held/prepared, task/attempt/workday history, recipient-scoped projection |
| Sync/recovery | sync-recovery | Stable action result, old-device evidence, replay/dependencies/conflicts, signed delivery/admin, applied checkpoints, gap/expiry reconciliation, external inbox/outbox |
| Reporting | reporting | Workday/round timing, filter/snapshot-equivalent export job/status/download |

Additional §9/§17 operations are private routing, map assets and owner diagnostics; §11 local capture/update actions appear explicitly. Source administrative screens in the native mock call the provisioning/intake/receipt commands above through P27’s durable source outbox. Prepared-to-received is never hidden inside an update task operation. Save-preview and server-confirmed start stay separate; current change uses explicit heading selection; end-day performs closure/carry-forward without a second silent command.

## Operation and event inventory

### session-context

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `session.bootstrap` | http-read | verified-local | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Issue browser-bound CSRF token; grants no account access. |
| `session.resolveCompany` | http-read | verified-local | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Resolve company code to safe login context; company selection grants no authority. |
| `account.registerIndependent` | http-command | verified-local | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Register a separate B2C phone/password identity with recovery email. |
| `account.verifyRecoveryEmail` | http-command | verified-local | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Complete recovery-email verification; no SMS claim. Implemented by configured Keycloak single-use action links; no Tawsel proof/password endpoint. |
| `session.beginLogin` | http-command | verified-local | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Begin OIDC authorization code / PKCE login. |
| `session.completeLogin` | http-command | verified-local | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Validate OIDC callback and establish independent Tawsel session. |
| `session.getContext` | http-read | verified-local | [P07](phases/07-oidc-login-recovery-sessions.md) | authenticated | Read current issuer-validated session and P06 access context. Display fields are never request authority. |
| `session.refresh` | http-command | verified-local | [P07](phases/07-oidc-login-recovery-sessions.md) | authenticated | Refresh authenticated backend session; no tokens in URLs. |
| `account.getStatus` | http-read | verified-local | [P07](phases/07-oidc-login-recovery-sessions.md) | authenticated | Read own activation/recovery state. |
| `account.beginRecovery` | http-command | verified-local | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Initiate email recovery without account enumeration. |
| `account.completeRecovery` | http-command | verified-local | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Consume verified recovery proof through the issuer. Implemented by configured Keycloak single-use action links; no Tawsel proof/password endpoint. |
| `session.logout` | http-command | verified-local | [P07](phases/07-oidc-login-recovery-sessions.md) | authenticated | End session; P35 adds durable pending-action/account-switch guards. |
| `device.getContext` | http-read | verified-local | [P20](phases/20-device-takeover-evidence.md) | execution.own | Scoped view/owner state; no execution token is disclosed. |

### integration-provisioning

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `integration.bindSource` | http-command | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | integration.manage | Bootstrap authorized tenant/integration binding and supported protocol versions. |
| `integration.rotateCredential` | http-command | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | integration.manage | Rotate scoped command credential with explicit overlap/recovery. |
| `integration.disableSource` | http-command | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | integration.manage | Disable source credentials without erasing audit or queued evidence. |
| `integration.getConfiguration` | http-read | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | integration.manage | Read authorized source configuration without secret disclosure. |
| `branch.provision` | http-command | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Apply versioned branch identity/location reference. |
| `branch.disable` | http-command | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Apply explicit versioned branch disable without deleting custody history. |
| `role.defineCapabilities` | http-command | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Apply versioned ERP role capability definition. |
| `user.provision` | http-command | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Bind ERP user reference to trusted issuer subject; no copied passwords. |
| `user.setRole` | http-command | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Assign exactly one role per company user. |
| `user.setCapabilityExceptions` | http-command | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Apply inherit/allow/deny overrides without bypassing resource scope. |
| `user.setBranchMemberships` | http-command | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Version branch membership; common effective capabilities across branches. |
| `user.disable` | http-command | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Revoke access without resurrecting via stale source revision. |
| `driver.provisionReference` | http-command | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Apply minimal execution driver/vehicle profile reference. |
| `provisioning.getStatus` | http-read | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Read application acceptance and separate issuer reconciliation state. |
| `provisioning.changed` | event | verified-local | [P08](phases/08-erp-provisioning-actor-binding.md) | recipient-scope | Versioned branch/user/role/membership/driver-reference acceptance. |

### intake

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `task.createIndependent` | http-command | verified-local | [P09](phases/09-b2c-task-intake.md) | execution.own | Create own simple B2C name/phone/destination/optional collection. |
| `task.reviseIndependent` | http-command | verified-local | [P09](phases/09-b2c-task-intake.md) | execution.own | Correct own eligible B2C task with revision guards. |
| `task.getIndependent` | http-read | verified-local | [P09](phases/09-b2c-task-intake.md) | execution.own | Inspect own persisted B2C task. |
| `task.listIndependent` | http-read | verified-local | [P09](phases/09-b2c-task-intake.md) | execution.own | List own intake/preparation work with bounded pagination. |
| `intake.submitSnapshot` | http-command | verified-local | [P10](phases/10-b2b-intake-admission.md) | intake.prepare | Accept generic source task/order/contact/location/content/policy revision. |
| `intake.prepare` | http-command | verified-local | [P10](phases/10-b2b-intake-admission.md) | intake.prepare | Prepare upcoming work without driver receipt/custody. |
| `assignment.receiveBatch` | http-command | verified-local | [P10](phases/10-b2b-intake-admission.md) | assignment.manage | Definitive ERP receipt assertion with all-or-none 50-stop admission. |
| `assignment.withdraw` | http-command | verified-local | [P10](phases/10-b2b-intake-admission.md) | assignment.manage | Ordinary predeparture withdrawal with history; no mandatory reason. Departure field guard exists; full start-race proof belongs to P15. |
| `assignment.reassignBeforeDeparture` | http-command | verified-local | [P10](phases/10-b2b-intake-admission.md) | assignment.manage | Change predeparture driver and assignment generation; no live transfer. |
| `intake.setUrgencyBeforeDeparture` | http-command | verified-local | [P10](phases/10-b2b-intake-admission.md) | intake.prepare | ERP priority update only before execution lock. |
| `intake.getBatchResult` | http-read | verified-local | [P10](phases/10-b2b-intake-admission.md) | assignment.manage | Recover durable accepted/rejected source results; 202 pending means no committed result is visible, not proof of receipt. |
| `task.snapshotAccepted` | event | verified-local | [P10](phases/10-b2b-intake-admission.md) | recipient-scope | Stable generic source task snapshot revision accepted. P10 durable own-source event intent; transport remains P25. |
| `task.independentCreated` | event | verified-local | [P09](phases/09-b2c-task-intake.md) | recipient-scope | Own B2C task recorded; no ERP recipient unless separately authorized. |
| `task.independentRevised` | event | verified-local | [P09](phases/09-b2c-task-intake.md) | recipient-scope | Own B2C task revision; preserve prior audit. |
| `assignment.prepared` | event | verified-local | [P10](phases/10-b2b-intake-admission.md) | recipient-scope | Upcoming preparation, no possession. P10 durable own-source event intent; transport remains P25. |
| `assignment.received` | event | verified-local | [P10](phases/10-b2b-intake-admission.md) | recipient-scope | Definitive batch received/admitted; not prepared. P10 durable own-source event intent; transport remains P25. |
| `assignment.withdrawn` | event | verified-local | [P10](phases/10-b2b-intake-admission.md) | recipient-scope | Predeparture removal. P10 durable own-source event intent; transport remains P25. |
| `assignment.reassigned` | event | verified-local | [P10](phases/10-b2b-intake-admission.md) | recipient-scope | Predeparture generation change. P10 durable own-source event intent; transport remains P25. |
| `intake.getTask` | http-read | verified-local | [P10](phases/10-b2b-intake-admission.md) | intake.prepare | Read current source snapshot, holder, readiness and dispatch identifiers. |
| `intake.listTasks` | http-read | verified-local | [P10](phases/10-b2b-intake-admission.md) | intake.prepare | List source-scoped held/prepared and unassigned/withdrawn work, filtered before pagination. |

### locations

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `location.searchCandidates` | http-read | verified-local | [P11](phases/11-locations-map-assets.md) | location.review | Scoped Nominatim candidates with provenance; never GPS/accuracy percentage. |
| `location.getSnapshot` | http-read | verified-local | [P11](phases/11-locations-map-assets.md) | monitor.read | Read original address and separate confirmed execution pin/revision. |
| `location.confirmPin` | http-command | verified-local | [P11](phases/11-locations-map-assets.md) | location.review | Authorized predeparture confirmation or assigned-driver execution correction. |
| `map.getAssetConfiguration` | http-read | verified-local | [P11](phases/11-locations-map-assets.md) | authenticated | Read configured self-hosted style/archive/attribution; no invented map coverage. |
| `location.pinConfirmed` | event | verified-local | [P11](phases/11-locations-map-assets.md) | recipient-scope | Durable source-scoped execution pin/provenance intent; source retained. Signed delivery is P25. |
| `location.list` | http-read | verified-local | [P11](phases/11-locations-map-assets.md) | location.review | Scoped focused location review list. |

### planning

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `routing.getVehicleProfiles` | http-read | verified-local | [P12](phases/12-engine-profile-adapters.md) | planning.manage | Authenticated car/motorcycle/bicycle modes and 600-second default; explicitly not a live Engine availability claim. |
| `routing.computeRoadRoute` | internal-work | verified-local | [P12](phases/12-engine-profile-adapters.md) | internal | Private OSRM route/table conversion, seconds/metres and explicit unreachable cells; controlled HTTP verified, actual Engine unavailable. |
| `routing.optimize` | internal-work | verified-local | [P12](phases/12-engine-profile-adapters.md) | internal | Private VROOM candidate validates exhaustive IDs, unassigned work, coordinates, relative timing and separate service estimates; controlled HTTP verified, live Engine unavailable. P14 validates route policy. |
| `planning.saveDraft` | http-command | verified-local | [P13](phases/13-planning-jobs-forecast-storage.md) | planning.manage | Save preview inputs: origin, vehicle, endpoint, service/time requirements; no start. |
| `planning.requestPreview` | http-command | verified-local | [P13](phases/13-planning-jobs-forecast-storage.md) | planning.manage | Queue durable asynchronous planning from coherent input revisions. |
| `planning.getJob` | http-read | verified-local | [P13](phases/13-planning-jobs-forecast-storage.md) | planning.manage | Read queued/running/complete/partial/failed/obsolete result. |
| `planning.getPlan` | http-read | verified-local | [P13](phases/13-planning-jobs-forecast-storage.md) | planning.manage | Read plan ID, route revision, order, pending/manual status and forecasts. |
| `planning.requestReplan` | http-command | verified-local | [P13](phases/13-planning-jobs-forecast-storage.md) | planning.manage | Request optimization without clearing current or undoing accepted facts. |
| `planning.setManualOrder` | http-command | verified-local | [P14](phases/14-route-policy-manual-fallback.md) | planning.manage | Revision-checked complete eligible order or first suggestion; current/urgent/capacity constraints, unknown road metrics, immutable manual forecast membership and stale-optimizer fence. No heading or round start. |
| `planning.publishRevision` | internal-work | verified-local | [P13](phases/13-planning-jobs-forecast-storage.md) | internal | Fence lease/current input, validate complete grouped route and atomically append ready/partial plan, forecast and source-scoped intent. Manual publication uses the same driver fence; no round start. |
| `plan.revisionPublished` | event | verified-local | [P13](phases/13-planning-jobs-forecast-storage.md) | recipient-scope | Source-scoped immutable plan/forecast/workload identity notice: historical draft or validated ready/partial/manual. Pending outbox intent; signed delivery remains P25. |

### execution

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `round.start` | http-command | verified-local | [P15](phases/15-round-start-departure-lock.md) | execution.own | Authoritative server round only. The immutable selected forecast retains its original planning time origin; startedAt is separate. No heading or arrival is implied. Takeover belongs to P20. |
| `current.selectHeading` | http-command | verified-local | [P16](phases/16-current-heading-arrival.md) | execution.own | Explicitly select/change eligible target; protect arrived work until resolved. |
| `current.recordArrival` | http-command | verified-local | [P16](phases/16-current-heading-arrival.md) | execution.own | Explicit arrival and physical-origin evidence; never inferred from outcome. |
| `outcome.recordFull` | http-command | verified-local | [P17](phases/17-outcomes-quantities-collection.md) | execution.own | Full result with exact permitted collection and coherent progress/outbox. |
| `outcome.recordPartial` | http-command | verified-local | [P17](phases/17-outcomes-quantities-collection.md) | execution.own | B2B whole pieces only; rejected remainder is held return-required. |
| `outcome.recordRefusal` | http-command | verified-local | [P17](phases/17-outcomes-quantities-collection.md) | execution.own | Refusal with shipping collection or explicit unpaid-shipping exception. |
| `outcome.recordNoAnswer` | http-command | verified-local | [P17](phases/17-outcomes-quantities-collection.md) | execution.own | Simple no-answer; no call counters or implied fee refusal/arrival. |
| `task.deferWhole` | http-command | verified-local | [P18](phases/18-deferral-retry-driver-urgency.md) | execution.own | Defer untouched whole work to earliest time; no narrow appointment guarantee. |
| `task.retryWhole` | http-command | verified-local | [P18](phases/18-deferral-retry-driver-urgency.md) | execution.own | Same-driver eligible untouched whole held return work, new attempt, before receipt. |
| `task.setDriverUrgency` | http-command | verified-local | [P18](phases/18-deferral-retry-driver-urgency.md) | execution.own | Assigned-driver urgency after departure; protect current/earliest eligibility. |
| `round.end` | http-command | verified-local | [P19](phases/19-workday-closure-carryover.md) | execution.own | End round explicitly with held unfinished work preserved. |
| `workday.end` | http-command | verified-local | [P19](phases/19-workday-closure-carryover.md) | execution.own | Close open workday/active round after resolving or pausing current; carry held work. |
| `device.takeOver` | http-command | verified-local | [P20](phases/20-device-takeover-evidence.md) | execution.own | Explicit online transfer to a different installation of the same authenticated driver; expected generation CAS; stable retry. Fetch snapshot before commands. |
| `outcome.correct` | http-command | verified-local | [P23](phases/23-bounded-driver-corrections.md) | correction.own | Driver appends correction in open day before dependent receipt/redispatch. |
| `evidence.adoptCompatible` | http-command | verified-local | [P23](phases/23-bounded-driver-corrections.md) | correction.own | Current owner adopts eligible former-device evidence under correction bounds. |
| `task.urgencyChanged` | event | verified-local | [P10](phases/10-b2b-intake-admission.md) | recipient-scope | Predeparture ERP urgency acceptance in P10; assigned-driver producer extends this contract in P18. P10 durable own-source event intent; transport remains P25. |
| `round.started` | event | verified-local | [P15](phases/15-round-start-departure-lock.md) | recipient-scope | Accepted start/departure/owner and baseline forecast. |
| `current.headingSelected` | event | verified-local | [P16](phases/16-current-heading-arrival.md) | recipient-scope | Explicit selection/change, not a next suggestion. |
| `current.arrivalRecorded` | event | verified-local | [P16](phases/16-current-heading-arrival.md) | recipient-scope | Explicit observed arrival; time provenance retained. |
| `outcome.recorded` | event | verified-local | [P17](phases/17-outcomes-quantities-collection.md) | recipient-scope | Full/partial/refused/no-answer with quantity/collection transition. |
| `task.deferred` | event | verified-local | [P18](phases/18-deferral-retry-driver-urgency.md) | recipient-scope | Untouched whole work earliest-time change. |
| `task.retryAdmitted` | event | verified-local | [P18](phases/18-deferral-retry-driver-urgency.md) | recipient-scope | New attempt on eligible whole held work; preserve prior outcome. |
| `round.ended` | event | verified-local | [P19](phases/19-workday-closure-carryover.md) | recipient-scope | Ended round, held work unchanged unless explicitly transitioned. |
| `workday.ended` | event | verified-local | [P19](phases/19-workday-closure-carryover.md) | recipient-scope | Explicit day closure/carryover; not automatic midnight. |
| `device.executionTransferred` | event | verified-local | [P20](phases/20-device-takeover-evidence.md) | recipient-scope | Durable account-recipient notification intent; no shipment transfer, device secret or ERP business mutation. Transport is P25. |
| `outcome.corrected` | event | verified-local | [P23](phases/23-bounded-driver-corrections.md) | recipient-scope | Append-only correction; consumers keep original transition identity. |
| `round.prepareStart` | http-command | verified-local | [P15](phases/15-round-start-departure-lock.md) | execution.own | Server-issued evidence expires after 60 seconds and is bound to account/device/plan/input. Start rechecks authority, accepted dependencies and the locked fingerprint. It does not activate work. |
| `round.getCurrent` | http-read | verified-local | [P15](phases/15-round-start-departure-lock.md) | execution.own | Authoritative server round only. The immutable selected forecast retains its original planning time origin; startedAt is separate. No heading or arrival is implied. Takeover belongs to P20. |
| `round.getStartResult` | http-read | verified-local | [P15](phases/15-round-start-departure-lock.md) | execution.own | Authoritative server round only. The immutable selected forecast retains its original planning time origin; startedAt is separate. No heading or arrival is implied. Takeover belongs to P20. |
| `current.correctOrigin` | http-command | verified-local | [P16](phases/16-current-heading-arrival.md) | execution.own | Explicit owner-fenced manual physical-origin correction; no current activity or arrival is inferred. |
| `current.getActivity` | http-read | verified-local | [P16](phases/16-current-heading-arrival.md) | execution.own | Read explicit current activity, separate next suggestion and physical-origin evidence for the assigned driver. P30 includes frozen source piece quantities/unit due and simple personal refusal in delivery choices; command-time checks remain authoritative. |
| `current.getResult` | http-read | verified-local | [P16](phases/16-current-heading-arrival.md) | execution.own | Recover only own current activity action results with current scope reauthorization. |
| `outcome.getRound` | http-read | verified-local | [P17](phases/17-outcomes-quantities-collection.md) | execution.own | Effective own-round outcomes and exact reported progress |
| `outcome.getResult` | http-read | verified-local | [P17](phases/17-outcomes-quantities-collection.md) | execution.own | Recover retained outcome command by stable action ID |
| `task.activateDeferred` | http-command | verified-local | [P18](phases/18-deferral-retry-driver-urgency.md) | execution.own | Explicit eligibility transition; retained history and driver authority. |
| `task.getEligibility` | http-read | verified-local | [P18](phases/18-deferral-retry-driver-urgency.md) | execution.own | Server-derived permissions/history or stable action recovery. |
| `task.getEligibilityAction` | http-read | verified-local | [P18](phases/18-deferral-retry-driver-urgency.md) | execution.own | Server-derived permissions/history or stable action recovery. |
| `task.deferredActivated` | event | verified-local | [P18](phases/18-deferral-retry-driver-urgency.md) | recipient-scope | Committed assigned-driver eligibility change; source-scoped durable intent. |
| `task.driverUrgencyChanged` | event | verified-local | [P18](phases/18-deferral-retry-driver-urgency.md) | recipient-scope | Committed assigned-driver eligibility change; source-scoped durable intent. |
| `workday.getSummary` | http-read | verified-local | [P19](phases/19-workday-closure-carryover.md) | execution.own | Basic explicit-workday outcome/collection summary, held carry-forward and retained per-round activity revisions for between-round closure (P31). |
| `workday.getCarryForward` | http-read | verified-local | [P19](phases/19-workday-closure-carryover.md) | execution.own | Current held work for the workday holder; no per-day cloning or implicit retry. |
| `closure.getResult` | http-read | verified-local | [P19](phases/19-workday-closure-carryover.md) | execution.own | Recover a retained closure result; unknown action remains pending. |
| `outcome.getCorrectionAvailability` | http-read | verified-local | [P23](phases/23-bounded-driver-corrections.md) | execution.own | Read original/effective correction eligibility and permitted next steps. P30 includes original outcome and replacement delivery inputs excluding the replaced attempt from prior shipping; allowed/constraints remain the authority. |
| `correction.getResult` | http-read | verified-local | [P23](phases/23-bounded-driver-corrections.md) | execution.own | Recover the same driver correction result by action ID. |

### returns

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `return.listSourceBranchGroups` | http-read | verified-local | [P21](phases/21-source-return-receipt.md) | execution.own | Group held return-required portions by originating branch, with display labels and authorized unresolved requests for cross-phone recovery (P31). |
| `return.requestHandover` | http-command | verified-local | [P21](phases/21-source-return-receipt.md) | execution.own | Driver offers source-branch pieces; request is not receipt/stock. |
| `return.getRequest` | http-read | verified-local | [P21](phases/21-source-return-receipt.md) | execution.own | Scoped request, offered/received/unresolved subsets and revisions. |
| `return.confirmSubsetReceipt` | http-command | verified-local | [P21](phases/21-source-return-receipt.md) | return.receive | Native ERP trusted actor confirms actually received requested subset. |
| `return.recordDisposition` | http-command | verified-local | [P21](phases/21-source-return-receipt.md) | return.dispose | ERP loss/damage disposition distinct from physical receipt and inventory. |
| `branch.interruptRound` | http-command | verified-local | [P22](phases/22-branch-interruption-redispatch.md) | execution.own | Pause heading sequence and enter source-branch service within same round/capacity. |
| `branch.resumeRound` | http-command | verified-local | [P22](phases/22-branch-interruption-redispatch.md) | execution.own | Resume retained sequence after authoritative claimed-subset receipt; no whole-batch gate. |
| `dispatch.createFromReceipt` | http-command | verified-local | [P22](phases/22-branch-interruption-redispatch.md) | assignment.manage | Redispatch only confirmed branch-received goods in new cycle/assignment. |
| `return.requested` | event | verified-local | [P21](phases/21-source-return-receipt.md) | recipient-scope | Offered pieces only, never stock/received. |
| `return.subsetReceived` | event | verified-local | [P21](phases/21-source-return-receipt.md) | recipient-scope | Actual confirmed source-branch subset transition. |
| `return.dispositionRecorded` | event | verified-local | [P21](phases/21-source-return-receipt.md) | recipient-scope | Loss/damage separate from receipt. |
| `branch.roundInterrupted` | event | verified-local | [P22](phases/22-branch-interruption-redispatch.md) | recipient-scope | Visible branch segment with retained customer sequence. |
| `branch.roundResumed` | event | verified-local | [P22](phases/22-branch-interruption-redispatch.md) | recipient-scope | Confirmed claimed subsets and retained work resume. |
| `dispatch.createdFromReceipt` | event | verified-local | [P22](phases/22-branch-interruption-redispatch.md) | recipient-scope | New dispatch cycle linked to prior confirmed receipt. |
| `return.getResult` | http-read | verified-local | [P21](phases/21-source-return-receipt.md) | execution.own | Recover own driver offer command; pending is not physical receipt. |
| `return.checkConfirmation` | http-read | verified-local | [P21](phases/21-source-return-receipt.md) | execution.own | Read server confirmation for an explicit cumulative claimed subset. Waiting never grants resume; P22 rechecks under lock. |
| `return.listPending` | http-read | verified-local | [P21](phases/21-source-return-receipt.md) | return.receive | Native source-scoped pending requests for one driver and originating branch, paginated in pages of 100 without a returns quota. |
| `return.getNativeRequest` | http-read | verified-local | [P21](phases/21-source-return-receipt.md) | return.receive | Native source-scoped accurate requested/received/unresolved/lost/damaged state per item. |
| `return.getNativeResult` | http-read | verified-local | [P21](phases/21-source-return-receipt.md) | return.receive | Recover durable native source receipt/disposition command results; 202 means unknown pending. |
| `branch.recordArrival` | http-command | verified-local | [P22](phases/22-branch-interruption-redispatch.md) | execution.own | Explicit arrival at the source-bound branch; records physical origin without inferring receipt. |
| `branch.arrivalRecorded` | event | verified-local | [P22](phases/22-branch-interruption-redispatch.md) | recipient-scope | Confirmed branch arrival; no physical receipt or stock implication. |
| `dispatch.listCycles` | http-read | verified-local | [P22](phases/22-branch-interruption-redispatch.md) | assignment.manage | Source-scoped preserved dispatch snapshots, holders and predecessor identities. |

### monitoring-history

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `monitoring.getDriverSnapshot` | http-read | verified-local | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Coherent authorized driver read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim. |
| `monitoring.getTripSnapshot` | http-read | verified-local | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Coherent authorized trip read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim. |
| `monitoring.getTaskHistory` | http-read | verified-local | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Coherent authorized task read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim. |
| `monitoring.getWorkdayHistory` | http-read | verified-local | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Coherent authorized workday read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim. |
| `integration.getExecutionProjection` | http-read | verified-local | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Coherent authorized driver read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim. |
| `progress.snapshot` | event | designed | [P24](phases/24-coherent-monitoring-api.md) | recipient-scope | Replacement scoped snapshot; never erases missing business events. |
| `monitoring.getAction` | http-read | verified-local | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Coherent authorized action read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim. |
| `integration.getTripProjection` | http-read | verified-local | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Coherent authorized trip read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim. |
| `integration.getTaskHistory` | http-read | verified-local | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Coherent authorized task read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim. |
| `integration.getWorkdayHistory` | http-read | verified-local | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Coherent authorized workday read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim. |
| `integration.getMonitoringAction` | http-read | verified-local | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Coherent authorized action read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim. |

### sync-recovery

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `action.getResult` | http-read | verified-local | [P05](phases/05-postgres-atomic-command-kernel.md) | authenticated | P20 scoped execution/takeover action result. Other operation families keep their feature adapters; unknown action IDs return pending without leaking another account. |
| `evidence.receiveFormerDevice` | http-command | verified-local | [P20](phases/20-device-takeover-evidence.md) | execution.own | Durably receive an original former-device envelope, without applying business state. Exact repeat is duplicate and returns its established result. |
| `sync.submitActions` | http-command | designed | [P34](phases/34-ordered-replay-conflict-recovery.md) | execution.own | Dependency-ordered replay batch with per-action result, original identity/version. |
| `sync.getEvidenceReceipt` | http-read | verified-local | [P34](phases/34-ordered-replay-conflict-recovery.md) | execution.own | Own driver evidence with durable original receipt, current recovery constraints and adopted outcome linkage. Outcome adoption is implemented under P23 correction bounds. |
| `sync.listConflicts` | http-read | designed | [P34](phases/34-ordered-replay-conflict-recovery.md) | execution.own | Read preserved conflicts and currently permitted resolution choices. |
| `integration.configureWebhook` | http-command | verified-local | [P25](phases/25-outbox-signed-delivery.md) | integration.manage | Authorize callback destination and recipient network restrictions. |
| `integration.rotateSigningKey` | http-command | verified-local | [P25](phases/25-outbox-signed-delivery.md) | integration.manage | Rotate integration-scoped webhook secret/key ID with overlap. |
| `integration.getDeliveryStatus` | http-read | verified-local | [P25](phases/25-outbox-signed-delivery.md) | integration.manage | Read outbound pending/sending/received/failed independently of application. |
| `integration.retryDelivery` | http-command | verified-local | [P25](phases/25-outbox-signed-delivery.md) | integration.manage | Controlled retry retaining committed event identity. |
| `integration.replayEvents` | http-read | verified-local | [P25](phases/25-outbox-signed-delivery.md) | integration.manage | Scoped aggregate sequence replay with explicit retained-window/expired status. |
| `integration.getReconciliationSnapshot` | http-read | verified-local | [P26](phases/26-mock-inbox-projection-recovery.md) | integration.manage | Scoped authoritative checkpoint/snapshot recovery after gaps/expired replay. |
| `integration.reportAppliedCheckpoint` | http-command | verified-local | [P26](phases/26-mock-inbox-projection-recovery.md) | integration.manage | Authenticated receiver reports separately durable applied/failed state. |
| `integration.getAppliedCheckpoint` | http-read | verified-local | [P26](phases/26-mock-inbox-projection-recovery.md) | integration.manage | Read receiver processing checkpoint without inferring it from HTTP receipt. |
| `consumer.receiveSignedEvent` | http-command | verified-local | [P26](phases/26-mock-inbox-projection-recovery.md) | external-consumer | External ERP callback: verify, durable inbox, then acknowledge receipt. |
| `consumer.applyInboxEvent` | internal-work | verified-local | [P26](phases/26-mock-inbox-projection-recovery.md) | external-consumer | ERP-local atomic projection plus processed marker, deduplication and gap recovery. |
| `source.deliverCommandIntent` | internal-work | verified-local | [P27](phases/27-native-mock-erp-source.md) | external-consumer | ERP-local native change plus command outbox, durable pending/accepted/rejected status. |
| `source.getCommandStatus` | http-read | verified-local | [P27](phases/27-native-mock-erp-source.md) | external-consumer | Consumer-owned authenticated read of durable source command and local record status; acceptance remains separate from receiver application. |
| `evidence.received` | event | verified-local | [P20](phases/20-device-takeover-evidence.md) | recipient-scope | Durable submitting-account notification after rejected domain writes roll back. Query the scoped original action receipt; never imply business acceptance. No envelope/contact/money data in the notification. |
| `evidence.adoptionResolved` | event | verified-local | [P23](phases/23-bounded-driver-corrections.md) | recipient-scope | Own-account notification of an accepted explicit adoption, linked to preserved evidence and effective outcome; blocked proposals emit evidence.received. |
| `integration.applicationReported` | event | designed | [P26](phases/26-mock-inbox-projection-recovery.md) | recipient-scope | Reserved future application notification; P26 implements separately authenticated checkpoint HTTP reporting without recursive outbound events. |
| `device.getSnapshot` | http-read | verified-local | [P20](phases/20-device-takeover-evidence.md) | execution.own | Download current confirmed activity/targets under the owner lock. Only the matching logical owner receives the generation snapshot token. P33 brackets authorized download reads with this locked owner/activity snapshot; local durability is a separate client transaction. |
| `integration.getDeliveryDetail` | http-read | verified-local | [P25](phases/25-outbox-signed-delivery.md) | integration.manage | Inspect one scoped delivery and bounded retained attempts. |
| `consumer.getStatus` | http-read | verified-local | [P26](phases/26-mock-inbox-projection-recovery.md) | external-consumer | Authenticated external receiver status with separate durable received/applied watermarks and historical limitations. |

### reporting

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `report.getWorkday` | http-read | designed | [P36](phases/36-workday-timing-reports.md) | reports.read | Authorized workday results/quantities/collection with explicit denominators/currency. |
| `report.getRoundTiming` | http-read | designed | [P36](phases/36-workday-timing-reports.md) | reports.read | Initial/revised forecast versus matching actual observations and uncertainty. |
| `report.requestExcelExport` | http-command | designed | [P37](phases/37-authorized-excel-export.md) | reports.export | Create authorized export bound to same filter/snapshot/timezone as report. |
| `report.getExportStatus` | http-read | designed | [P37](phases/37-authorized-excel-export.md) | reports.export | Read pending/ready/failed/expired export status. |
| `report.downloadExport` | http-read | designed | [P37](phases/37-authorized-excel-export.md) | reports.export | Reauthorize and download text-safe Excel artifact before expiry. |

### diagnostics

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `diagnostics.getHealth` | http-read | designed | [P38](phases/38-diagnostics-freshness-capacity.md) | diagnostics.read | Separate readiness/database/worker/Engine/integration health; scoped operational evidence. |
| `diagnostics.getCapacityAndFreshness` | http-read | designed | [P38](phases/38-diagnostics-freshness-capacity.md) | diagnostics.read | Measured latency/lag/load/queue/lease/resource view with stated conditions. |

### local-ui

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `ui.callRecipient` | local-ui | verified-local | [P29](phases/29-ordinary-driver-delivery-ui.md) | local | Open dialer; no call count, contact outcome or movement event. |
| `ui.messageRecipient` | local-ui | verified-local | [P29](phases/29-ordinary-driver-delivery-ui.md) | local | Open WhatsApp; no execution transition. |
| `ui.openNavigation` | local-ui | verified-local | [P29](phases/29-ordinary-driver-delivery-ui.md) | local | Open external navigation; does not set heading/arrival. |
| `ui.filterAndInspect` | local-ui | designed | [P03](phases/03-design-action-specification.md) | local | Inspect details, select driver, filter/map/list, open focused dialogs; reads use catalog APIs. |
| `ui.prepareDraft` | local-ui | designed | [P28](phases/28-online-preparation-journeys.md) | local | Enter unsaved forms/pin/route input; saving uses intake/location/planning operations. |
| `ui.captureOfflineAction` | local-ui | verified-local | [P33](phases/33-offline-local-capture.md) | local | Atomic local journal and pending projection for allowed downloaded started work. |
| `ui.requestPersistentStorage` | local-ui | verified-local | [P33](phases/33-offline-local-capture.md) | local | Request browser storage persistence and report actual availability. |
| `ui.retrySynchronization` | local-ui | designed | [P34](phases/34-ordered-replay-conflict-recovery.md) | local | Trigger authenticated replay using original action identities. |
| `ui.reauthenticateSameAccount` | local-ui | designed | [P35](phases/35-offline-auth-updates-ux.md) | local | Preserve queue and invoke session login for its owning account. |
| `ui.switchAccount` | local-ui | designed | [P35](phases/35-offline-auth-updates-ux.md) | local | Block unsynchronized exit; otherwise use safe logout/login, no identity merge. |
| `ui.applySafeUpdate` | local-ui | designed | [P35](phases/35-offline-auth-updates-ux.md) | local | Apply versioned shell/storage update only at safe pending-work boundary. |
| `ui.downloadStartedWork` | local-ui | verified-local | [P33](phases/33-offline-local-capture.md) | local | Store authorized snapshots/geometry for confirmed round; not offline new-round start. |

### workspace

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `workspace.getHealth` | http-read | verified-local | [P01](phases/01-workspace-test-harness.md) | public | Existing GET /health: scope=workspace, engine=not-checked; not the public integration API. |

## Contradictions, naming and remaining proof

The §5–15/18–20 review found no unresolved concrete product contradiction after applying the decision map. D-73 staff correction is superseded by D-91/D-95/D-96; D-68 receipt-before-resume and D-80 confirmed-subset continuation coexist. `trip` and `round` name the same resource; task/cycle/assignment/attempt remain different. These are terminology resolutions, not new permissions.

Full-capacity branch interruption and bounded correction are locally verified in P22/P23. Signing/header details (P25), human-bound operations beyond P08 service provisioning (their feature owner), feature payload schemas (each owner), replay/retention implementation (P25–26/P34–35), target service configuration and real ERP choices remain concrete future work. The legacy README Engine examples do not override the application’s 600-second service default or complete route validation.

No V1 GPS, billing, call counter, advanced POD, direct driver transfer, settlement, ERP schema coupling or B2C splitting/custody operation is present. [Integration guide](integration-guide.md) and [ERP planning index](erp/README.md) explain the unreleased boundary. [Phase evidence](phase-02-evidence.md) records verification separately.
