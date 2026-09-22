# Canonical foundation examples

`valid.json` and `invalid.json` contain `{id, schema, valid, data}` records, with an expected failing keyword for invalid cases. `schema` resolves locally under `contracts/`; `.invalid` IDs are identifiers, never network dependencies. `npm run contracts:demo` validates all examples and checks generated artifacts without running an Engine or business service.

These are **designed examples**. Common values and envelope structure are fully validated here. The illustrative `payload` in an action/event is not a completed feature schema. Feature owners replace these with their exact versioned schemas/examples before accepting or emitting such messages. Envelope validity does not validate quantity conservation, authorization, cross-field currency/time policy or business acceptance.

`action-partial-envelope` uses distinct task/cycle/assignment/workday/trip/plan/stop/attempt IDs and EGP 25,000 integer minor units. `event-return-request` offers one piece and asserts only `requested`, never branch receipt or available stock. Transition event IDs differ from a newer progress replacement snapshot. `evidence-old-device-review` preserves receipt without a commit or ERP-applied claim. See the complete correction/subset/fresh-dispatch [state walkthrough](../../docs/tracking-and-consistency.md).

No endpoint URL, credential or automatic ERP compatibility is claimed. Real consumer quickstart and conformance arrive in P26–27; this phase's portable types example is in `packages/api-client/examples/consumer.ts`.
