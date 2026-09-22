# Canonical foundation examples

P13 `p13-*` examples cover explicit planning settings, revisioned snapshots/commands, durable job status, partial candidate forecasts and source-scoped draft notice. Invalid examples reject invented GPS provenance, missing attempt identity, false active/policy claims, invalid revisions/statuses and impossible running/completed status fields. These are canonical data examples; PostgreSQL/HTTP/process acceptance evidence is in [Phase 13](../../docs/phase-13-evidence.md).

P10 p10-* entries now cover closed snapshot/prepare/receive/withdraw/reassign/urgency envelopes, explicit prepaid and exact partial-prepaid allocations, typed event intent and capacity/allocation/stale errors. Invalid examples cover fractional pieces, missing due/splitting permission, ambiguous deposits, mixed currency and unasserted receipt. Schemas own shape; connected PostgreSQL tests additionally enforce exact sums, scope, revision and capacity. [Public consumer demo](../../docs/b2b-intake.md) executes real HTTP; examples alone are not acceptance evidence.


`valid.json` and `invalid.json` contain `{id, schema, valid, data}` records, with an expected failing keyword for invalid cases. `schema` resolves locally under `contracts/`; `.invalid` IDs are identifiers, never network dependencies. `npm run contracts:demo` validates all examples and checks generated artifacts without running an Engine or business service.

Most foundation examples are **designed examples**. Common values and envelope structure are fully validated here. P08 provisioning and P09 independent intake add exact implemented feature schemas/examples; other illustrative action/event payloads are not completed feature schemas. Feature owners replace them before accepting or emitting messages. Envelope validity never establishes authorization or business acceptance.

`action-partial-envelope` uses distinct task/cycle/assignment/workday/trip/plan/stop/attempt IDs and EGP 25,000 integer minor units. `event-return-request` offers one piece and asserts only `requested`, never branch receipt or available stock. Transition event IDs differ from a newer progress replacement snapshot. `evidence-old-device-review` preserves receipt without a commit or ERP-applied claim. See the complete correction/subset/fresh-dispatch [state walkthrough](../../docs/tracking-and-consistency.md).

No endpoint URL, credential or automatic ERP compatibility is claimed. Real consumer quickstart and conformance arrive in P26–27; this phase's portable types example is in `packages/api-client/examples/consumer.ts`.

P09 adds `p09-create-address-task`, `p09-confirmed-pin-task` and invalid missing-phone/wrong-EGP-exponent cases. The runtime additionally enforces personal-tenant ownership, positive collection, revision/departure locking and location readiness through real PostgreSQL tests; see [P09 evidence](../../docs/phase-09-evidence.md).

P06 adds `access-*`: explicit inherit/allow/deny overrides; company, personal and integration `AccessContext`; lifecycle denial; invalid role-name grants, branch-specific overrides, personal branches, integration driver/own-work grants and duplicate capabilities. These are schema conformance fixtures. Real PostgreSQL isolation tests use labelled principals/synthetic resource rows and are documented in [P06 evidence](../../docs/phase-06-evidence.md); no example is a production authentication mechanism.

P05 adds `action-result-full` and `action-result-compacted`, plus invalid missing-response, compacted-with-response and pending-result cases. These use illustrative delivery data for schema conformance only. Actual database tests exercise explicitly synthetic counters and real migrations. Compacted results preserve the original receipt/stable summary, omit full response status/body, and never authorize a new action ID. The public `action.getResult` route still awaits authenticated P06–P08 bindings.

P12 adds normalized routing input, unreachable-table and profile-metadata examples, plus invalid GPS origin, provider-only bike mode and positional coordinates. Provider fixtures live separately in apps/api/test/support/engine-fixtures.ts and are never public payloads. `npm run test:engine` exercises private conversion; `npm run test:erp:routing` checks consumer semantics.
