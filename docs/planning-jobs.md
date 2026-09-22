# Durable planning and forecast revisions — Phase 13

Accepted intake, calculation, stored draft and round start are separate facts. P13 stores **candidate drafts** with `policyValidated:false`. `complete` describes provider coverage of the eligible input only. Phase 14 validates complete route policy; Phase 15 starts a round and binds its first-start baseline. No P13 operation activates a round, changes a current target, implements manual fallback or claims an urgent-first guarantee.

## Run and inspect

```powershell
npm ci
npm run db:local:start
npm run db:migrate
npm run test:planning
npm run planning:demo
npm run test:erp:planning
npm run planning:worker:once
# Long-running process, separately supervised from Fastify:
npm run planning:worker
```

Use Node 24.15+ within the repository's Node 24 range (verified here with 24.19.0), npm 11 and PostgreSQL 18. `db:local:start` requires the installed PostgreSQL `bin` on PATH and operates only on the dedicated Tawsel cluster. The demo creates/removes an isolated test database, uses labelled authenticated-principal fixtures and controlled loopback VROOM HTTP, and writes `.local/phase-13-demo.json` with actual committed rows. It proves persistence, not real road routes. `test:planning` additionally kills a real worker during delayed HTTP and races real source/pin/assignment changes. The real-session/HTTP restart check is `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/session-auth.test.ts -t 'P13:'`.

The production worker reads `TAWSEL_DATABASE_URL` and the P12 `TAWSEL_*` Engine settings in [.env.example](../.env.example). It requires current migrations and never migrates/imports maps or starts Engine services. One process runs one calculation at a time; operators may run several processes. Database constraints and driver locks limit each driver to one running claim plus one pending replacement. The default 90-second lease exceeds P12's configured maximum 60-second HTTP timeout; lease-bounded cancellation also covers shutdown. Claims and completions use separate short transactions. The worker holds no connection while calling Engine. Supervise/restart the worker on a database/process failure; SIGINT/SIGTERM abort the provider request, while an abrupt kill leaves the job recoverable after lease expiry.

## Public workflow

All paths use a human browser session with `kind=personal|company`; mutations require same-origin CSRF. `PlanningClient` handles bootstrap and typed requests. ERP service credentials cannot impersonate staff or read a mixed-source driver route. Own-driver capability is accepted; staff need `planning.manage` and access to every branch represented by the driver and snapshot. Ordinary staff planning is prohibited once any affected work departed. Historical reads recheck current access, including all historical snapshot branches.

| Operation | HTTP / meaning |
| --- | --- |
| `planning.getPlan` | `GET /api/v1/planning/drivers/{driverId}/plans`: immutable revisions newest first, `latestJob`, `settingsRevision`, `limit` (1–50), `beforeRevision`; null cursor ends history |
| `planning.saveDraft` | `POST /api/v1/planning/commands/planning.saveDraft`: exact action envelope, `driverId`, `expectedSettingsRevision`, `settings`; compare-and-set inputs and enqueue |
| `planning.requestPreview` / `planning.requestReplan` | Same command-path pattern; `driverId`, `expectedSettingsRevision`; enqueue a fresh calculation generation without changing choices |
| `planning.getJob` | `GET /api/v1/planning/jobs/{jobId}`: durable status, safe dependency error, attempts, lease expiry, retry time, plan ID and newer-job link |

Settings require vehicle mode, an explicitly selected **manual pin** origin, endpoint and `plannedStartAt` UTC instant. The instant anchors estimates; it is not an actual start. Default endpoint is explicitly `last-customer`; personal fixed endpoint and company branch endpoint are supported. Company branch identity is scope-checked and its coordinates are the user's explicit selected pin, not an inferred latest GPS/branch measurement. Branch service uses a separate required estimate. Authoritative last-confirmed-stop origin integration is P16; clients cannot forge that provenance here.

An accepted command returns HTTP 202 and a durable ActionResult containing `{settingsRevision, job}`. Keep the exact action ID/envelope after a timeout and retry it unchanged. It returns the original receipt; poll `job.jobId` for current status. A fresh retry command after `failed` creates a new generation/job, preserving the old failure. Input conflicts return 409 and require a reload/new command. Unknown or inaccessible IDs return 404. Responses are `no-store`; errors expose no provider URL or raw response.

The receipt's `resourceVersions.planningInputRevision` is the driver's complete input generation; it is distinct from `settingsRevision`, which is the compare-and-set value for changing preview settings.

| Job status | Meaning |
| --- | --- |
| pending | Durable intent; awaiting worker, retry time or explicit blocker (`settings-required`, `no-eligible-work`, `capacity-exceeded`) |
| running | A committed lease exists; expiry is visible and recoverable |
| complete | A full provider candidate and forecast are stored as a draft; policy approval/start still absent |
| partial | Candidate retained with explicit unassigned IDs; unassigned estimates and whole-workload finish are null |
| failed | Dependency/validation failure, including exhaustion of three automatic attempts; accepted intake remains committed |
| superseded | Newer inputs or choices won; result cannot replace the current draft; follow the newer job ID |

Transient busy/timeout/cancelled/unavailable/HTTP failures retry with persisted exponential delay (2, 4 seconds for the default three-attempt limit). Invalid responses/configuration and other provider errors fail without automatic retry. Expired claims receive a new random token and immutable claim-attempt row. A dead worker's expired or replaced token cannot publish, even if its HTTP response eventually arrives. Historical complete jobs stay complete; `inputCurrent:false` on their plan reports that inputs have since changed. `current` identifies the last stored candidate pointer, not authority to start a round.

## Trigger and fingerprint semantics

B2C creation/revision, B2B receipt, held source/urgency edits, withdrawal/reassignment and pin confirmation enqueue **in the same transaction** as the authoritative command, result, history and required outbound intent. Prepared/unassigned ERP snapshots do not imply receipt or an executable sequence. Pin changes on prepared work may queue a snapshot, but that member remains excluded. Reassignment queues both affected drivers under sorted locks. There is no Engine call in these transactions. Migration 0009 retains old P10/P11 pending intents and seeds intent for retained B2C tasks; the worker materializes those under the same locks.

Each new accepted trigger increments a driver's monotonic `input_revision`; a retry of the same intent does not. Pending work is coalesced by marking the old job superseded, never deleting history. Running work keeps its lease until it finishes or expires. Job input JSON and fingerprint cannot be modified. Fingerprint v1 is SHA-256 of the P05 canonical JSON encoding, with members sorted by task/attempt ID. It includes tenant/driver/account kind, input/settings/execution/manual/location-input revisions, settings/mode/origin/endpoint/time anchor, current target and every member's stable task/attempt/cycle, source/assignment/pin revisions, pin coordinates, urgency, earliest availability, departure marker, reservation state, eligibility and service estimate. Canonical encoding sorts object keys and preserves array order; wall-clock claim time, lease and retry count are excluded.

Eligibility uses the saved time anchor and existing admission ledger, not the completion-time wall clock. Prepared, unresolved, future and non-reserved/completed/paused ERP work remains in the snapshot with an exclusion reason. P13 does not silently reactivate future work or admit over 50 stops; P18 owns that transition. B2C intake over the calculation limit is visible as `capacity-exceeded`, not silently truncated. The 600-second customer estimate is stored per member. Urgency/current target are captured but not advertised as enforced route ordering before P14.

At completion the worker acquires tenant revocation lock → P05 driver invariant lock → planning state → job row, checks token and database-clock expiry, rebuilds authoritative input and compares fingerprint/latest-job identity. A mismatch supersedes success **or failure**, records diagnostic candidate/error and queues current work when needed. Result persistence appends plan, forecast, membership and source-scoped `plan.revisionPublished` intent and updates the draft pointer atomically. Unique job/plan/driver-revision constraints prevent duplicate effective publication.

**Future writer contract:** P14/P16/P17/P18 must use the same tenant/driver lock before manual order, target, physical origin, outcome or attempt changes; advance the appropriate `manual_revision`/`execution_revision`, update authoritative member eligibility and call `enqueuePlanning` before commit. The stored `current_target` carries task/attempt/revision. Tests mutate these future fields with real locked transactions only to establish fencing; those actions are not implemented by P13. Do not use a route revision as an outcome concurrency token.

## Stored history and ERP notice

`planning_attempts` allocates stable initial visit identities without asserting heading/arrival/outcome. `plan_revisions` is append-only; each references one job/fingerprint. `forecast_revisions` preserves its forecast/workload IDs, explicit time origin and finish estimate. `forecast_members` retains every snapshot member, revision and attempt identity, assigned/unassigned/excluded membership, position and arrival/completion estimates. Excluded/unassigned times are null. Separate estimate rows are never reconstructed from a later plan. A branch endpoint remains identified in the immutable settings/candidate and its separate service estimate; actual branch-service attempts belong to later execution phases.

No first-start baseline exists yet. P15 must reference a chosen stored revision and establish its baseline once. Later revisions retain their independent workload identity so reports can distinguish changed scope. Route geometry is not invented; these are P12 normalized VROOM candidates. P14 owns complete routing/urgency/earliest/current-prefix validation and manual fallback.

For each source represented in a stored company draft, `plan.revisionPublished` records only job/plan/driver/revision/forecast/workload identity, draft state, provider status and `policyValidated:false`. It contains no other source's task list. It is an atomic **pending outbox intent**, not delivered/received/applied ERP evidence; signed transport is P25. See [ERP mapping](erp/field-and-status-mapping.md), [consumer guidance](erp/consumer-quickstart.md) and [ordered evidence](phase-13-evidence.md).

Live Engine versions, datasets and road quality remain unavailable/unverified as recorded by P12. P13 adds no UI, browser/device evidence, urgent-order guarantee, active round, device takeover or reporting UI.
