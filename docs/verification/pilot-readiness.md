# Pilot readiness — 26 September 2026

**Local preparation and verification complete; live pilot not approved.** Owner explicitly requested local preparation/verification now, with physical devices and owner review later. [Runnable walkthrough and recording sheets](pilot-walkthrough.md), [ordered phase evidence](../phase-41-evidence.md), [implementation status](../implementation-status.md).

## Required remaining conditions

| Condition | Observed state / effect | Next concrete evidence |
| --- | --- | --- |
| Configured live Engine and maps | All nine local route/table/optimization probes unavailable. Actual Cairo basemap renders in desktop Chromium; controlled routing is separate. | Operator supplies configured target and records service/profile/image/dataset identities; run all three modes and unavailable/manual continuation. No imports as app setup. |
| Physical Android/Chrome | Unrun; no hardware supplied. | Device/OS/browser/build, installation/reopen and full device sheet in walkthrough. |
| Physical iPhone/Safari | Unrun; desktop Chromium supplies no Safari/iOS evidence. | Same sheet, including actual home-screen and safe-area behavior. |
| Approximately 24 elapsed offline hours | **Not started**, no start/end timestamps or device observation. | Genuine uninterrupted interval and queued original action IDs before/after reopen and reconnect. Accelerated fixtures remain separate. |
| Owner review | Deferred explicitly; no quotes, approval or tap measurement received. | Unnarrated state-by-state review, exact feedback, fixes and retest. |
| Target deployment/recovery | P39 target/container/TLS/email and P40 independent backup/restore remain pending. | Target inventory/access, off-host storage and key escrow, external recovery email/alert, timed isolated restore. Local tiny same-host recovery is insufficient. |
| Capacity | P38 baseline local measurements passed; 15 drivers/10 observers missed the 5s ERP application target (p95 upper bound 6309ms), with pool errors recorded. | Owner-chosen pilot load tested on actual host, including errors/clock uncertainty. No extrapolated supported concurrency. |

## A–P evidence map

These are evidence references and limits, not blanket acceptance marks. Earlier proofs retain their original fixture/device classifications.

| Group | Concrete evidence available | Failed/unrun condition |
| --- | --- | --- |
| A B2C | P41 continuous real local OIDC/HTTP/PostgreSQL UI run: two new tasks, actual map pin confirmation, planning/start/two deliveries/day close/report/real XLSX. [Recorded result](../../output/playwright/phase-41/b2c.json). [P07](../phase-07-evidence.md) owns registration/email recovery. | P41 account is preverified synthetic; Engine controlled HTTP; registration/SMTP and complete configured target journey unrun. |
| B B2B boundary | [P27 native source](../phase-27-evidence.md), [P31 branch flow](../phase-31-evidence.md), P41 source and paced branch browser reruns passed. Separate native mock storage/public APIs. | Commercial ERP connector and target deployment unrun. |
| C Admission/authority | [P10](../phase-10-evidence.md), [P15](../phase-15-evidence.md) real transaction/race proof; prepared/receipt/start distinctions in native flow. | Historical proof, no new high-load authority claim. |
| D Execution | P41 explicit heading/arrival/full outcomes; [P29](../phase-29-evidence.md), [P31](../phase-31-evidence.md) current/branch/takeover. | Logical browser phones do not establish physical devices. |
| E Quantities/money | [P17](../phase-17-evidence.md), [P30](../phase-30-evidence.md), actual optional 125.50 EGP in P41 report/XLSX. | No financial settlement or physical custody inferred. |
| F Returns/corrections | [P21](../phase-21-evidence.md), [P23](../phase-23-evidence.md), native subset and retained remainder browser scenario. | Real branch staff/owner review pending. |
| G Atomicity | [P05](../phase-05-evidence.md) and owning-module PostgreSQL tests use actual independent transactions; selected P41 connected results recorded separately. | No mocked transaction treated as durability proof. |
| H Synchronization | [P25](../phase-25-evidence.md), [P26](../phase-26-evidence.md), [P40 restore](restore.md) retained event identity/application checkpoint/replay. | Distributed target and long outages unrun here. |
| I Offline/device | [P33](../phase-33-evidence.md), [P34](../phase-34-evidence.md), [P35](../phase-35-evidence.md); P41 desktop production-PWA recovery/replay reruns passed 4/4. | Both physical platforms, actual elapsed day and hardware/storage-pressure observation outstanding. |
| J Planning failure | [P12](../phase-12-evidence.md), [P14](../phase-14-evidence.md), [P28](../phase-28-evidence.md), P41 controlled failure/manual-start browser passed; live probe failed unavailable. | Actual service/dataset/profile suitability unverified. |
| K Monitoring | [P32](../phase-32-evidence.md), [P38 measurements](performance.md) and raw baseline/ramp/stress reports. | Higher-load target missed; target-host capacity unknown. |
| L Isolation | [P06](../phase-06-evidence.md), [P35](../phase-35-evidence.md), [P37](../phase-37-evidence.md); P41 prerequisite export/reauth checks. | No universal browser or external ERP assurance. |
| M Reports/time | [P36](../phase-36-evidence.md), [P37](../phase-37-evidence.md), P41 closed-day UI/download same task identities and formula-looking literal. | Owner interpretation and physical download UX unreviewed. |
| N Visual/function | [All nine references](../ui-reference-audit.md), [extensions/state inventory](../ui-spec.md), [current UI review](../ui-review.md), P41 captures. | Real safe areas/keyboard/OS enlarged text/assistive technology and exhaustive page-state review remain pending. |
| O Operations | [P38](performance.md), [P39](deployment.md), [P40](restore.md), 29 P41 prerequisite checks. | Target release and separate failure-domain recovery unavailable. |
| P Simplicity | [Walkthrough](pilot-walkthrough.md#owner-simplicity-review-no-implementer-narration), explicit observed defects and local interaction captures in [UI review](../ui-review.md). | Owner deferred; no owner approval or “every state is obvious” claim. |

## Phase 42 handoff boundary

May rely on the exact passed commands, artifacts and classifications recorded in [Phase 41 evidence](../phase-41-evidence.md), the walkthrough, current UI findings and prior canonical schemas/client/operation map. Public interface inventory has not changed in Phase 41. Must keep every condition above visible; implementation progress cannot convert missing evidence into acceptance. Phase 42 is not executed by this task.
