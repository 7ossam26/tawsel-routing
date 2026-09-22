# Canonical operation ownership and coverage

Generated from [contracts/operations.json](../contracts/operations.json) by `npm run contracts:generate`.

**Every domain HTTP operation and event below is designed and unavailable.** Only the existing non-domain workspace health route is verified locally. Feature owners complete exact paths, authentication bindings, request/response/event schemas and examples before implementation, then update lifecycle and evidence. No generic CRUD endpoint replaces these explicit actions.

`designed` means specification only; `implemented` requires an actual handler/producer; `verified-local` additionally requires recorded local evidence. Neither means deployed or interoperable with a real ERP. Events are produced by the feature owner listed; P25 transports committed intent and P26 verifies the external receiver.

P05/P06 foundations: PostgreSQL command/retention and tenant/capability/resource authorization are verified internally. The catalog authorizationFoundation records the P06 evidence and canonical shared schemas. action.getResult remains designed as an HTTP operation: P07/P08 must authenticate and its adapter must recheck resource visibility before disclosing retained details. No domain command/event is promoted; see [P05 evidence](phase-05-evidence.md), [P06 evidence](phase-06-evidence.md) and [permission contract/guard inputs](authorization.md).

Operation IDs are stable protocol identifiers, not live URLs. Paths/methods are intentionally unassigned until their owner defines a complete operation. Local UI actions invoke no business mutation by themselves; internal-work rows are not public endpoints. The external consumer/source rows belong to the separate ERP process.

[UI action coverage](ui-actions.md) maps every catalog entry to role/state, page or focused overlay, feedback and connected UI phase. [UI specification](ui-spec.md) and [reference audit](ui-reference-audit.md) define requirement-driven additions/removals and Arabic state acceptance. These are designed surfaces, not working endpoints or browser evidence; [Phase 03 evidence](phase-03-evidence.md) records the document checks.

The Capability column names the scoped capability family. For own-driver reads, planning and locations, `execution.own` is an explicit server-policy alternative to staff `monitor.read`, `planning.manage` or `location.review`, constrained to that driver’s authorized work. Predeparture staff authority never implies postdeparture execution authority. `authenticated`, `public`, `local`, `internal`, `external-consumer` and `recipient-scope` denote boundary contexts, not configurable role grants. P06 implements reusable enforcement; P07/P08 establish real authentication/provisioning and each feature supplies locked lifecycle predicates. The [permission table](authorization.md) and [authority tables](tracking-and-consistency.md) remain binding.

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
| `session.resolveCompany` | http-read | designed | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Resolve company code to safe login context; company selection grants no authority. |
| `account.registerIndependent` | http-command | designed | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Register a separate B2C phone/password identity with recovery email. |
| `account.verifyRecoveryEmail` | http-command | designed | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Complete recovery-email verification; no SMS claim. |
| `session.beginLogin` | http-command | designed | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Begin OIDC authorization code / PKCE login. |
| `session.completeLogin` | http-command | designed | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Validate OIDC callback and establish independent Tawsel session. |
| `session.getContext` | http-read | designed | [P07](phases/07-oidc-login-recovery-sessions.md) | authenticated | Read server-resolved AccessContext: stable account source, tenant, assigned active branches and effective capabilities. Display snapshot grants no authority; HTTP adapter remains P07. |
| `session.refresh` | http-command | designed | [P07](phases/07-oidc-login-recovery-sessions.md) | authenticated | Refresh authenticated backend session; no tokens in URLs. |
| `account.getStatus` | http-read | designed | [P07](phases/07-oidc-login-recovery-sessions.md) | authenticated | Read own activation/recovery state. |
| `account.beginRecovery` | http-command | designed | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Initiate email recovery without account enumeration. |
| `account.completeRecovery` | http-command | designed | [P07](phases/07-oidc-login-recovery-sessions.md) | public | Consume verified recovery proof through the issuer. |
| `session.logout` | http-command | designed | [P07](phases/07-oidc-login-recovery-sessions.md) | authenticated | End session; P35 adds durable pending-action/account-switch guards. |
| `device.getContext` | http-read | designed | [P20](phases/20-device-takeover-evidence.md) | execution.own | Read active round and execution generation on any signed-in phone. |

### integration-provisioning

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `integration.bindSource` | http-command | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | integration.manage | Bootstrap authorized tenant/integration binding and supported protocol versions. |
| `integration.rotateCredential` | http-command | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | integration.manage | Rotate scoped command credential with explicit overlap/recovery. |
| `integration.disableSource` | http-command | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | integration.manage | Disable source credentials without erasing audit or queued evidence. |
| `integration.getConfiguration` | http-read | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | integration.manage | Read authorized source configuration without secret disclosure. |
| `branch.provision` | http-command | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Apply versioned branch identity/location reference. |
| `branch.disable` | http-command | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Apply explicit versioned branch disable without deleting custody history. |
| `role.defineCapabilities` | http-command | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Apply versioned ERP role capability definition. |
| `user.provision` | http-command | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Bind ERP user reference to trusted issuer subject; no copied passwords. |
| `user.setRole` | http-command | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Assign exactly one role per company user. |
| `user.setCapabilityExceptions` | http-command | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Apply inherit/allow/deny overrides without bypassing resource scope. |
| `user.setBranchMemberships` | http-command | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Version branch membership; common effective capabilities across branches. |
| `user.disable` | http-command | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Revoke access without resurrecting via stale source revision. |
| `driver.provisionReference` | http-command | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Apply minimal execution driver/vehicle profile reference. |
| `provisioning.getStatus` | http-read | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | identity.provision | Read application acceptance and separate issuer reconciliation state. |
| `provisioning.changed` | event | designed | [P08](phases/08-erp-provisioning-actor-binding.md) | recipient-scope | Versioned branch/user/role/membership/driver-reference acceptance. |

### intake

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `task.createIndependent` | http-command | designed | [P09](phases/09-b2c-task-intake.md) | execution.own | Create own simple B2C name/phone/destination/optional collection. |
| `task.reviseIndependent` | http-command | designed | [P09](phases/09-b2c-task-intake.md) | execution.own | Correct own eligible B2C task with revision guards. |
| `task.getIndependent` | http-read | designed | [P09](phases/09-b2c-task-intake.md) | execution.own | Inspect own persisted B2C task. |
| `task.listIndependent` | http-read | designed | [P09](phases/09-b2c-task-intake.md) | execution.own | List own intake/preparation work with bounded pagination. |
| `intake.submitSnapshot` | http-command | designed | [P10](phases/10-b2b-intake-admission.md) | intake.prepare | Accept generic source task/order/contact/location/content/policy revision. |
| `intake.prepare` | http-command | designed | [P10](phases/10-b2b-intake-admission.md) | intake.prepare | Prepare upcoming work without driver receipt/custody. |
| `assignment.receiveBatch` | http-command | designed | [P10](phases/10-b2b-intake-admission.md) | assignment.manage | Definitive ERP receipt assertion with all-or-none 50-stop admission. |
| `assignment.withdraw` | http-command | designed | [P10](phases/10-b2b-intake-admission.md) | assignment.manage | Withdraw before departure; race start without mandatory reason/handover. |
| `assignment.reassignBeforeDeparture` | http-command | designed | [P10](phases/10-b2b-intake-admission.md) | assignment.manage | Change predeparture driver and assignment generation; no live transfer. |
| `intake.setUrgencyBeforeDeparture` | http-command | designed | [P10](phases/10-b2b-intake-admission.md) | intake.prepare | ERP priority update only before execution lock. |
| `intake.getBatchResult` | http-read | designed | [P10](phases/10-b2b-intake-admission.md) | assignment.manage | Recover entire accepted/rejected batch and uncertain response. |
| `task.snapshotAccepted` | event | designed | [P10](phases/10-b2b-intake-admission.md) | recipient-scope | Stable generic source task snapshot revision accepted. |
| `task.independentCreated` | event | designed | [P09](phases/09-b2c-task-intake.md) | recipient-scope | Own B2C task recorded; no ERP recipient unless separately authorized. |
| `task.independentRevised` | event | designed | [P09](phases/09-b2c-task-intake.md) | recipient-scope | Own B2C task revision; preserve prior audit. |
| `assignment.prepared` | event | designed | [P10](phases/10-b2b-intake-admission.md) | recipient-scope | Upcoming preparation, no possession. |
| `assignment.received` | event | designed | [P10](phases/10-b2b-intake-admission.md) | recipient-scope | Definitive batch received/admitted; not prepared. |
| `assignment.withdrawn` | event | designed | [P10](phases/10-b2b-intake-admission.md) | recipient-scope | Predeparture removal. |
| `assignment.reassigned` | event | designed | [P10](phases/10-b2b-intake-admission.md) | recipient-scope | Predeparture generation change. |

### locations

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `location.searchCandidates` | http-read | designed | [P11](phases/11-locations-map-assets.md) | location.review | Scoped Nominatim candidates with provenance; never GPS/accuracy percentage. |
| `location.getSnapshot` | http-read | designed | [P11](phases/11-locations-map-assets.md) | monitor.read | Read original address and separate confirmed execution pin/revision. |
| `location.confirmPin` | http-command | designed | [P11](phases/11-locations-map-assets.md) | location.review | Authorized predeparture confirmation or assigned-driver execution correction. |
| `map.getAssetConfiguration` | http-read | designed | [P11](phases/11-locations-map-assets.md) | authenticated | Read configured self-hosted style/archive/attribution; no invented map coverage. |
| `location.pinConfirmed` | event | designed | [P11](phases/11-locations-map-assets.md) | recipient-scope | Execution pin/provenance revision, source address retained. |

### planning

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `routing.getVehicleProfiles` | http-read | designed | [P12](phases/12-engine-profile-adapters.md) | planning.manage | Expose supported car/motorcycle/bicycle application modes. |
| `routing.computeRoadRoute` | internal-work | designed | [P12](phases/12-engine-profile-adapters.md) | internal | Private OSRM adapter with metre/second units; no public provider payload. |
| `routing.optimize` | internal-work | designed | [P12](phases/12-engine-profile-adapters.md) | internal | Private VROOM adapter validates all task IDs, unassigned work and time origin. |
| `planning.saveDraft` | http-command | designed | [P13](phases/13-planning-jobs-forecast-storage.md) | planning.manage | Save preview inputs: origin, vehicle, endpoint, service/time requirements; no start. |
| `planning.requestPreview` | http-command | designed | [P13](phases/13-planning-jobs-forecast-storage.md) | planning.manage | Queue durable asynchronous planning from coherent input revisions. |
| `planning.getJob` | http-read | designed | [P13](phases/13-planning-jobs-forecast-storage.md) | planning.manage | Read queued/running/complete/partial/failed/obsolete result. |
| `planning.getPlan` | http-read | designed | [P13](phases/13-planning-jobs-forecast-storage.md) | planning.manage | Read plan ID, route revision, order, pending/manual status and forecasts. |
| `planning.requestReplan` | http-command | designed | [P13](phases/13-planning-jobs-forecast-storage.md) | planning.manage | Request optimization without clearing current or undoing accepted facts. |
| `planning.setManualOrder` | http-command | designed | [P14](phases/14-route-policy-manual-fallback.md) | planning.manage | Explicit eligible manual first/remaining route when needed; same constraints. |
| `planning.publishRevision` | internal-work | designed | [P13](phases/13-planning-jobs-forecast-storage.md) | internal | Publish only current fingerprint, preserving protected current and first forecast; start publishes atomically in P15. |
| `plan.revisionPublished` | event | designed | [P13](phases/13-planning-jobs-forecast-storage.md) | recipient-scope | Current valid plan publication, manual/optimized and forecast scope identified. |

### execution

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `round.start` | http-command | designed | [P15](phases/15-round-start-departure-lock.md) | execution.own | Online synchronized start: one round/day/device, departure lock and first forecast. |
| `current.selectHeading` | http-command | designed | [P16](phases/16-current-heading-arrival.md) | execution.own | Explicitly select/change eligible target; protect arrived work until resolved. |
| `current.recordArrival` | http-command | designed | [P16](phases/16-current-heading-arrival.md) | execution.own | Explicit arrival and physical-origin evidence; never inferred from outcome. |
| `outcome.recordFull` | http-command | designed | [P17](phases/17-outcomes-quantities-collection.md) | execution.own | Full result with exact permitted collection and coherent progress/outbox. |
| `outcome.recordPartial` | http-command | designed | [P17](phases/17-outcomes-quantities-collection.md) | execution.own | B2B whole pieces only; rejected remainder is held return-required. |
| `outcome.recordRefusal` | http-command | designed | [P17](phases/17-outcomes-quantities-collection.md) | execution.own | Refusal with shipping collection or explicit unpaid-shipping exception. |
| `outcome.recordNoAnswer` | http-command | designed | [P17](phases/17-outcomes-quantities-collection.md) | execution.own | Simple no-answer; no call counters or implied fee refusal/arrival. |
| `task.deferWhole` | http-command | designed | [P18](phases/18-deferral-retry-driver-urgency.md) | execution.own | Defer untouched whole work to earliest time; no narrow appointment guarantee. |
| `task.retryWhole` | http-command | designed | [P18](phases/18-deferral-retry-driver-urgency.md) | execution.own | Same-driver eligible untouched whole held return work, new attempt, before receipt. |
| `task.setDriverUrgency` | http-command | designed | [P18](phases/18-deferral-retry-driver-urgency.md) | execution.own | Assigned-driver urgency after departure; protect current/earliest eligibility. |
| `round.end` | http-command | designed | [P19](phases/19-workday-closure-carryover.md) | execution.own | End round explicitly with held unfinished work preserved. |
| `workday.end` | http-command | designed | [P19](phases/19-workday-closure-carryover.md) | execution.own | Close open workday/active round after resolving or pausing current; carry held work. |
| `device.takeOver` | http-command | designed | [P20](phases/20-device-takeover-evidence.md) | execution.own | Online same-driver takeover increments generation, preserves former-device evidence. |
| `outcome.correct` | http-command | designed | [P23](phases/23-bounded-driver-corrections.md) | correction.own | Driver appends correction in open day before dependent receipt/redispatch. |
| `evidence.adoptCompatible` | http-command | designed | [P23](phases/23-bounded-driver-corrections.md) | correction.own | Current owner adopts eligible former-device evidence under correction bounds. |
| `task.urgencyChanged` | event | designed | [P10](phases/10-b2b-intake-admission.md) | recipient-scope | Predeparture ERP urgency acceptance in P10; assigned-driver producer extends this contract in P18. |
| `round.started` | event | designed | [P15](phases/15-round-start-departure-lock.md) | recipient-scope | Accepted start/departure/owner and baseline forecast. |
| `current.headingSelected` | event | designed | [P16](phases/16-current-heading-arrival.md) | recipient-scope | Explicit selection/change, not a next suggestion. |
| `current.arrivalRecorded` | event | designed | [P16](phases/16-current-heading-arrival.md) | recipient-scope | Explicit observed arrival; time provenance retained. |
| `outcome.recorded` | event | designed | [P17](phases/17-outcomes-quantities-collection.md) | recipient-scope | Full/partial/refused/no-answer with quantity/collection transition. |
| `task.deferred` | event | designed | [P18](phases/18-deferral-retry-driver-urgency.md) | recipient-scope | Untouched whole work earliest-time change. |
| `task.retryAdmitted` | event | designed | [P18](phases/18-deferral-retry-driver-urgency.md) | recipient-scope | New attempt on eligible whole held work; preserve prior outcome. |
| `round.ended` | event | designed | [P19](phases/19-workday-closure-carryover.md) | recipient-scope | Ended round, held work unchanged unless explicitly transitioned. |
| `workday.ended` | event | designed | [P19](phases/19-workday-closure-carryover.md) | recipient-scope | Explicit day closure/carryover; not automatic midnight. |
| `device.executionTransferred` | event | designed | [P20](phases/20-device-takeover-evidence.md) | recipient-scope | New device generation within same driver/round. |
| `outcome.corrected` | event | designed | [P23](phases/23-bounded-driver-corrections.md) | recipient-scope | Append-only correction; consumers keep original transition identity. |

### returns

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `return.listSourceBranchGroups` | http-read | designed | [P21](phases/21-source-return-receipt.md) | execution.own | Group held return-required portions by originating branch. |
| `return.requestHandover` | http-command | designed | [P21](phases/21-source-return-receipt.md) | execution.own | Driver offers source-branch pieces; request is not receipt/stock. |
| `return.getRequest` | http-read | designed | [P21](phases/21-source-return-receipt.md) | monitor.read | Scoped request, offered/received/unresolved subsets and revisions. |
| `return.confirmSubsetReceipt` | http-command | designed | [P21](phases/21-source-return-receipt.md) | return.receive | Native ERP trusted actor confirms actually received requested subset. |
| `return.recordDisposition` | http-command | designed | [P21](phases/21-source-return-receipt.md) | return.dispose | ERP loss/damage disposition distinct from physical receipt and inventory. |
| `branch.interruptRound` | http-command | designed | [P22](phases/22-branch-interruption-redispatch.md) | execution.own | Pause heading sequence and enter source-branch service within same round/capacity. |
| `branch.resumeRound` | http-command | designed | [P22](phases/22-branch-interruption-redispatch.md) | execution.own | Resume retained sequence after authoritative claimed-subset receipt; no whole-batch gate. |
| `dispatch.createFromReceipt` | http-command | designed | [P22](phases/22-branch-interruption-redispatch.md) | assignment.manage | Redispatch only confirmed branch-received goods in new cycle/assignment. |
| `return.requested` | event | designed | [P21](phases/21-source-return-receipt.md) | recipient-scope | Offered pieces only, never stock/received. |
| `return.subsetReceived` | event | designed | [P21](phases/21-source-return-receipt.md) | recipient-scope | Actual confirmed source-branch subset transition. |
| `return.dispositionRecorded` | event | designed | [P21](phases/21-source-return-receipt.md) | recipient-scope | Loss/damage separate from receipt. |
| `branch.roundInterrupted` | event | designed | [P22](phases/22-branch-interruption-redispatch.md) | recipient-scope | Visible branch segment with retained customer sequence. |
| `branch.roundResumed` | event | designed | [P22](phases/22-branch-interruption-redispatch.md) | recipient-scope | Confirmed claimed subsets and retained work resume. |
| `dispatch.createdFromReceipt` | event | designed | [P22](phases/22-branch-interruption-redispatch.md) | recipient-scope | New dispatch cycle linked to prior confirmed receipt. |

### monitoring-history

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `monitoring.getDriverSnapshot` | http-read | designed | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Coherent current/next/progress/held/prepared/ownership snapshot, conditional refresh. |
| `monitoring.getTripSnapshot` | http-read | designed | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Scoped coherent trip/forecast view; redact unauthorized source details. |
| `monitoring.getTaskHistory` | http-read | designed | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Task/cycle/attempt/effective outcome plus original correction history. |
| `monitoring.getWorkdayHistory` | http-read | designed | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Explicit day/round history with carryover and timestamps. |
| `integration.getExecutionProjection` | http-read | designed | [P24](phases/24-coherent-monitoring-api.md) | monitor.read | Recipient-scoped task/trip/assignment projection excluding other integrations. |
| `progress.snapshot` | event | designed | [P24](phases/24-coherent-monitoring-api.md) | recipient-scope | Replacement scoped snapshot; never erases missing business events. |

### sync-recovery

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `action.getResult` | http-read | designed | [P05](phases/05-postgres-atomic-command-kernel.md) | authenticated | Read durable full/compacted command result for the authenticated source, rechecking current capability and associated resource visibility before disclosing stored details. P05/P06 primitives verified internally; HTTP adapter remains unavailable. |
| `evidence.receiveFormerDevice` | http-command | designed | [P20](phases/20-device-takeover-evidence.md) | execution.own | Durably receive old-generation evidence without accepting execution. |
| `sync.submitActions` | http-command | designed | [P34](phases/34-ordered-replay-conflict-recovery.md) | execution.own | Dependency-ordered replay batch with per-action result, original identity/version. |
| `sync.getEvidenceReceipt` | http-read | designed | [P34](phases/34-ordered-replay-conflict-recovery.md) | execution.own | Recover durable received/rejected/review evidence without implying acceptance. |
| `sync.listConflicts` | http-read | designed | [P34](phases/34-ordered-replay-conflict-recovery.md) | execution.own | Read preserved conflicts and currently permitted resolution choices. |
| `integration.configureWebhook` | http-command | designed | [P25](phases/25-outbox-signed-delivery.md) | integration.manage | Authorize callback destination and recipient network restrictions. |
| `integration.rotateSigningKey` | http-command | designed | [P25](phases/25-outbox-signed-delivery.md) | integration.manage | Rotate integration-scoped webhook secret/key ID with overlap. |
| `integration.getDeliveryStatus` | http-read | designed | [P25](phases/25-outbox-signed-delivery.md) | integration.manage | Read outbound pending/sending/received/failed independently of application. |
| `integration.retryDelivery` | http-command | designed | [P25](phases/25-outbox-signed-delivery.md) | integration.manage | Controlled retry retaining committed event identity. |
| `integration.replayEvents` | http-read | designed | [P25](phases/25-outbox-signed-delivery.md) | integration.manage | Scoped aggregate sequence replay with explicit retained-window/expired status. |
| `integration.getReconciliationSnapshot` | http-read | designed | [P26](phases/26-mock-inbox-projection-recovery.md) | integration.manage | Scoped authoritative checkpoint/snapshot recovery after gaps/expired replay. |
| `integration.reportAppliedCheckpoint` | http-command | designed | [P26](phases/26-mock-inbox-projection-recovery.md) | integration.manage | Authenticated receiver reports separately durable applied/failed state. |
| `integration.getAppliedCheckpoint` | http-read | designed | [P26](phases/26-mock-inbox-projection-recovery.md) | integration.manage | Read receiver processing checkpoint without inferring it from HTTP receipt. |
| `consumer.receiveSignedEvent` | http-command | designed | [P26](phases/26-mock-inbox-projection-recovery.md) | external-consumer | External ERP callback: verify, durable inbox, then acknowledge receipt. |
| `consumer.applyInboxEvent` | internal-work | designed | [P26](phases/26-mock-inbox-projection-recovery.md) | external-consumer | ERP-local atomic projection plus processed marker, deduplication and gap recovery. |
| `source.deliverCommandIntent` | internal-work | designed | [P27](phases/27-native-mock-erp-source.md) | external-consumer | ERP-local native change plus command outbox, durable pending/accepted/rejected status. |
| `source.getCommandStatus` | http-read | designed | [P27](phases/27-native-mock-erp-source.md) | external-consumer | Native mock ERP reads its own durable source command status; not a Tawsel endpoint. |
| `evidence.received` | event | designed | [P20](phases/20-device-takeover-evidence.md) | recipient-scope | Evidence-only durable receipt; not business acceptance. |
| `evidence.adoptionResolved` | event | designed | [P23](phases/23-bounded-driver-corrections.md) | recipient-scope | Compatible adoption/correction result, or durable rejected review. |
| `integration.applicationReported` | event | designed | [P26](phases/26-mock-inbox-projection-recovery.md) | recipient-scope | Receiver application checkpoint evidence separate from receipt. |

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
| `ui.callRecipient` | local-ui | designed | [P29](phases/29-ordinary-driver-delivery-ui.md) | local | Open dialer; no call count, contact outcome or movement event. |
| `ui.messageRecipient` | local-ui | designed | [P29](phases/29-ordinary-driver-delivery-ui.md) | local | Open WhatsApp; no execution transition. |
| `ui.openNavigation` | local-ui | designed | [P29](phases/29-ordinary-driver-delivery-ui.md) | local | Open external navigation; does not set heading/arrival. |
| `ui.filterAndInspect` | local-ui | designed | [P03](phases/03-design-action-specification.md) | local | Inspect details, select driver, filter/map/list, open focused dialogs; reads use catalog APIs. |
| `ui.prepareDraft` | local-ui | designed | [P28](phases/28-online-preparation-journeys.md) | local | Enter unsaved forms/pin/route input; saving uses intake/location/planning operations. |
| `ui.captureOfflineAction` | local-ui | designed | [P33](phases/33-offline-local-capture.md) | local | Atomic local journal and pending projection for allowed downloaded started work. |
| `ui.requestPersistentStorage` | local-ui | designed | [P33](phases/33-offline-local-capture.md) | local | Request browser storage persistence and report actual availability. |
| `ui.retrySynchronization` | local-ui | designed | [P34](phases/34-ordered-replay-conflict-recovery.md) | local | Trigger authenticated replay using original action identities. |
| `ui.reauthenticateSameAccount` | local-ui | designed | [P35](phases/35-offline-auth-updates-ux.md) | local | Preserve queue and invoke session login for its owning account. |
| `ui.switchAccount` | local-ui | designed | [P35](phases/35-offline-auth-updates-ux.md) | local | Block unsynchronized exit; otherwise use safe logout/login, no identity merge. |
| `ui.applySafeUpdate` | local-ui | designed | [P35](phases/35-offline-auth-updates-ux.md) | local | Apply versioned shell/storage update only at safe pending-work boundary. |
| `ui.downloadStartedWork` | local-ui | designed | [P33](phases/33-offline-local-capture.md) | local | Store authorized snapshots/geometry for confirmed round; not offline new-round start. |

### workspace

| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |
| --- | --- | --- | --- | --- | --- |
| `workspace.getHealth` | http-read | verified-local | [P01](phases/01-workspace-test-harness.md) | public | Existing GET /health: scope=workspace, engine=not-checked; not the public integration API. |

## Contradictions, naming and remaining proof

The §5–15/18–20 review found no unresolved concrete product contradiction after applying the decision map. D-73 staff correction is superseded by D-91/D-95/D-96; D-68 receipt-before-resume and D-80 confirmed-subset continuation coexist. `trip` and `round` name the same resource; task/cycle/assignment/attempt remain different. These are terminology resolutions, not new permissions.

Full-capacity branch interruption remains the explicitly labelled master-plan proposal for P22 to verify. Signing/header details (P25), trusted actor binding (P08), feature payload schemas (each owner), replay/retention implementation (P25–26/P34–35), target service configuration and real ERP choices remain concrete future work. The legacy README Engine examples do not override the application’s 600-second service default or complete route validation.

No V1 GPS, billing, call counter, advanced POD, direct driver transfer, settlement, ERP schema coupling or B2C splitting/custody operation is present. [Integration guide](integration-guide.md) and [ERP planning index](erp/README.md) explain the unreleased boundary. [Phase evidence](phase-02-evidence.md) records verification separately.
