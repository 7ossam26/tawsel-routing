# Reviewing a completed Tawsel phase

Use this after each task and before sending the next prompt. It is an evidence review, not a new mandatory approval ritual.

## Concrete scope

- The output matches the numbered phase's outcome and embedded rules.
- The actual Codex model/reasoning setting is recorded; a recommended name in the prompt is not evidence of the active setting.
- Each of its three implementation checkpoints has actual work and a focused check.
- Every acceptance scenario is covered by a meaningful test/demo or explicitly marked unavailable with its practical effect.
- Required behavior was not silently omitted because an older screenshot lacks a button or a library component was inconvenient.
- The agent did not execute later phases as an unreviewable one-shot or expand into excluded features.

## Working result

- There is a reproducible command or UI path to try what changed.
- Contracts/examples/generated client and actual handler behavior agree for implemented operations.
- Designed future operations remain distinguishable from working endpoints.
- Real database/network/browser boundaries are identified. Mocking all boundaries does not count as connected integration proof.
- Test output names business invariants and records actual commands/results, not a copied expected-result paragraph.

## Driver UI, when affected

- I can identify what this page is for, its next action and any missing input/waiting state.
- The common action is easy to reach; less frequent actions are contextual and discoverable.
- Back/cancel, pending/rejected/timeout and another-device states behave honestly.
- Arabic RTL, touch/focus, long content and reduced motion have actual browser evidence.
- Visual references preserve design language; decisions define features. New focused pages are allowed.
- Confusing copy or excessive taps are recorded as defects even if APIs and build pass.

## Handoff

- docs/implementation-status.md records implementation, verification and owner review separately.
- Missing external/device/target evidence stays outstanding with a specific consequence.
- The next task knows which real artifacts/versions to use and which dependencies remain unavailable.
- Affected ERP planning/mapping/quickstart artifacts agree with the public contract. In P26/P27/P42, external consumer evidence proves the boundary without Tawsel database access/internal imports; P42 also validates bundle versions/paths/digests.
- Unrelated changes, Engine data and Stitch originals are preserved.
- No owner approval, deployed status, real-time observation or final readiness is inferred from silence or file presence.

If the phase is genuinely too large for one bounded task after concrete implementation findings, split its remaining scope into named subphases, update dependencies/coverage/status and preserve the incomplete requirements. Do not silently declare it complete. This is an engineering adjustment under D-109, not a reason to reopen settled product discovery.

