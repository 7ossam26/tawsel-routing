# Independent-driver task intake

Phase 09 provides a real personal-account intake path at `/tasks`, `/tasks/new` and `/tasks/:taskId/edit`. It persists through PostgreSQL and uses the authenticated session, tenant guard, invariant locks and idempotent command kernel established by earlier phases.

## Reproducible two-task browser demo

```powershell
npm run db:local:start
npm run db:migrate
npm run identity:start
npm run identity:mail
npm run test:browser:b2c
```

Run `identity:start` and `identity:mail` in separate terminals because both stay attached to their local processes. If identity services already listen on ports 8085/8025, do not launch a second copy; run the browser command directly. Playwright starts a fresh API on port 3002 and Vite on 5173, registers a new personal identity through the real local Keycloak/Mailpit flow, creates two tasks at the same written address, reloads them from PostgreSQL, corrects one and verifies the other remains unchanged. The capture is `output/playwright/phase-09-two-tasks.png`.

This is local-provider evidence, not production email/TLS or physical-device evidence.

## Contract and behavior

- `POST /api/v1/independent/tasks` accepts `task.createIndependent`. Retrying one immutable action ID recovers the same retained task.
- `GET /api/v1/independent/tasks` lists only the authenticated personal driver's tasks, with a maximum page size of 50.
- `GET /api/v1/independent/tasks/{taskId}` hides other-account and guessed IDs.
- `PUT /api/v1/independent/tasks/{taskId}` accepts a full `task.reviseIndependent` snapshot with matching resource revision. Stale and departed edits are rejected durably.
- Recipient name, phone and either written address or confirmed coordinates are required. Optional collection is positive integer EGP minor units with exponent 2.
- Written address is `needs-resolution` and `executionReady=false`. P11 owns resolution, execution-location history and the real map picker.

Canonical payloads and response types live in `contracts/b2c-intake.schema.json` and generated `packages/api-client/src/schema.d.ts`. Today's user-facing form sends address-only input; it does not expose a fake coordinate field or map.

## Focused checks

```powershell
npm run test:contracts
npm run build -w @tawsel/shared
node --env-file-if-exists=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/b2c-intake.test.ts
npx vitest run --project fast apps/web/test/fast/b2c-intake.test.tsx
```

See [Phase 09 evidence](phase-09-evidence.md) for provider classifications, initial failures, exact results and remaining limits.
