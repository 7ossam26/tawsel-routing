import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { executeCommand, getCommandResult, type WriteStage } from '../../src/commands/kernel.js';
import { createDatabasePool } from '../../src/db/pool.js';
import { compactCommandResponses } from '../../src/commands/retention.js';
import { withTransaction } from '../../src/db/transaction.js';
import { lockInvariants } from '../../src/commands/locks.js';
import { deferred, observeDatabaseBlock } from '../support/barriers.js';
import { createTestDatabase } from '../support/database.js';
import { facts, fixtureHooks, makeCommand, prepareFixture, scopeA, sourceB, tenantB } from '../support/command-fixture.js';

describe('PostgreSQL atomic command kernel (committed test-only counters)', () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  beforeAll(async () => { db = await createTestDatabase(); await prepareFixture(db.pool); });
  afterAll(async () => { await db?.close(); });

  test('same scoped ID/payload returns the identical durable result and writes once', async () => {
    const command = makeCommand();
    const first = await executeCommand(db.pool, scopeA, command, fixtureHooks(command));
    const second = await executeCommand(db.pool, scopeA, command, fixtureHooks(command));
    expect(second).toEqual(first);
    expect(await getCommandResult(db.pool, scopeA, command.actionId)).toEqual(first);
    expect(first.receipt.businessStatus).toBe('accepted');
    expect(first.receipt.committedAt).toBeDefined();
    expect(await facts(db.pool, command)).toEqual({ command_identities: 1, command_audit: 1, command_evidence: 0,
      outbox_intents: 1, kernel_test_state: 1, kernel_test_progress: 1 });
    expect((await db.pool.query('SELECT state,resolved_at FROM tawsel.outbox_intents WHERE action_id=$1', [command.actionId])).rows)
      .toEqual([{ state: 'pending', resolved_at: null }]);
  });

  test('semantic object key ordering is a retry; changed payload/operation/base versions/actor conflict', async () => {
    const command = makeCommand();
    const original = await executeCommand(db.pool, scopeA, command, fixtureHooks(command));
    const reordered = { ...command, payload: { amount: 1, fixtureId: command.payload.fixtureId } };
    expect(await executeCommand(db.pool, scopeA, reordered, fixtureHooks(reordered))).toEqual(original);
    for (const changed of [ { ...command, payload: { ...command.payload, amount: 2 } },
      { ...command, operationId: 'test.other' }, { ...command, baseVersions: { resourceRevision: 9 } } ]) {
      await expect(executeCommand(db.pool, scopeA, changed, fixtureHooks(changed))).rejects.toMatchObject({ code: 'idempotency_conflict', statusCode: 409 });
    }
    await expect(executeCommand(db.pool, { ...scopeA, actorId: tenantB }, command, fixtureHooks(command))).rejects.toMatchObject({ code: 'idempotency_conflict' });
    expect(await getCommandResult(db.pool, scopeA, command.actionId)).toEqual(original);
    expect((await facts(db.pool, command)).kernel_test_state).toBe(1);
  });

  test('same textual ID across tenants and sources has separate results and no leakage', async () => {
    const command = makeCommand();
    await executeCommand(db.pool, scopeA, command, fixtureHooks(command));
    for (const scope of [{ ...scopeA, tenantId: tenantB }, { ...scopeA, sourceId: sourceB }]) {
      expect(await getCommandResult(db.pool, scope, command.actionId)).toBeNull();
      const other = { ...makeCommand(scope), actionId: command.actionId };
      const result = await executeCommand(db.pool, scope, other, fixtureHooks(other, scope));
      expect(result.summary.fixtureId).toBe(other.payload.fixtureId);
      expect(result.summary.fixtureId).not.toBe(command.payload.fixtureId);
    }
    await expect(executeCommand(db.pool, scopeA, makeCommand({ ...scopeA, tenantId: tenantB }), fixtureHooks(command))).rejects.toThrow('trusted scope');
  });

  for (const stage of ['identity','domain','progress','audit','outbox','result'] satisfies WriteStage[]) {
    test(`failure after ${stage} rolls back every accepted write, then same ID can retry`, async () => {
      const command = makeCommand();
      await expect(executeCommand(db.pool, scopeA, command, { ...fixtureHooks(command),
        async afterWrite(at) { if (at === stage) throw new Error(`injected after ${stage}`); }
      })).rejects.toThrow(`injected after ${stage}`);
      expect(await facts(db.pool, command)).toEqual({ command_identities: 0, command_audit: 0, command_evidence: 0,
        outbox_intents: 0, kernel_test_state: 0, kernel_test_progress: 0 });
      await executeCommand(db.pool, scopeA, command, fixtureHooks(command));
      expect((await facts(db.pool, command)).kernel_test_state).toBe(1);
    });
  }

  test('rejection rolls back tentative feature writes but commits distinct durable evidence', async () => {
    const command = makeCommand();
    const result = await executeCommand(db.pool, scopeA, command, fixtureHooks(command, scopeA, { reject: true }));
    expect(result.receipt.businessStatus).toBe('rejected');
    expect(result.receipt.committedAt).toBeUndefined();
    expect(await facts(db.pool, command)).toEqual({ command_identities: 1, command_audit: 1, command_evidence: 1,
      outbox_intents: 0, kernel_test_state: 0, kernel_test_progress: 0 });
    expect(await executeCommand(db.pool, scopeA, command, fixtureHooks(command))).toEqual(result);
    expect((await db.pool.query('SELECT kind FROM tawsel.command_audit WHERE action_id=$1', [command.actionId])).rows[0].kind).toBe('rejected-evidence');
  });

  test('failure while retaining rejected evidence leaves no partial receipt', async () => {
    const command = makeCommand();
    await expect(executeCommand(db.pool, scopeA, command, { ...fixtureHooks(command, scopeA, { reject: true }),
      async afterWrite(at) { if (at === 'evidence') throw new Error('evidence failure'); }
    })).rejects.toThrow('evidence failure');
    expect(Object.values(await facts(db.pool, command))).toEqual([0,0,0,0,0,0]);
  });

  for (const mode of ['commit', 'rollback', 'collision'] as const) {
    test(`two independent connections race (${mode}) with an observed database lock barrier`, async () => {
      const command = makeCommand();
      const winnerPool = createDatabasePool(db.config);
      const waiterPool = createDatabasePool(db.config);
      const entered = deferred<number>();
      const release = deferred();
      let waiterEnteredDomain = false;
      const waiterCommand = mode === 'collision' ? { ...command, payload: { ...command.payload, amount: 2 } } : command;
      const waiterHooks = fixtureHooks(waiterCommand);
      const waiterPid = (await waiterPool.query('SELECT pg_backend_pid() AS pid')).rows[0].pid as number;
      const first = executeCommand(winnerPool, scopeA, command, {
        ...fixtureHooks(command), async afterWrite(stage, tx) {
          if (stage === 'result') {
            entered.resolve((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid as number);
            await release.promise;
            if (mode === 'rollback') throw new Error('leader rolled back');
          }
        }
      }).then(value => ({ value }), error => ({ error }));
      const winnerPid = await entered.promise;
      const second = executeCommand(waiterPool, scopeA, waiterCommand, {
        ...waiterHooks, async writeDomain(tx, input, scope) { waiterEnteredDomain = true; return waiterHooks.writeDomain(tx, input, scope); }
      }).then(value => ({ value }), error => ({ error }));
      try {
        expect(winnerPid).not.toBe(waiterPid);
        await observeDatabaseBlock(db.pool, waiterPid, winnerPid);
        expect(waiterEnteredDomain).toBe(false);
        // Observer has a separate committed snapshot; none of the leader's writes leaked.
        expect(Object.values(await facts(db.pool, command))).toEqual([0,0,0,0,0,0]);
        release.resolve();
        const [leader, waiter] = await Promise.all([first, second]);
        if (mode === 'rollback') {
          expect(leader).toHaveProperty('error');
          expect(waiter).toHaveProperty('value');
          expect(waiterEnteredDomain).toBe(true);
        } else if (mode === 'collision') {
          expect(leader).toHaveProperty('value');
          expect(waiter).toMatchObject({ error: { code: 'idempotency_conflict' } });
          expect(waiterEnteredDomain).toBe(false);
        } else {
          expect(waiter).toEqual(leader);
          expect(waiterEnteredDomain).toBe(false);
        }
        expect(await facts(db.pool, command)).toEqual({ command_identities: 1, command_audit: 1, command_evidence: 0,
          outbox_intents: 1, kernel_test_state: 1, kernel_test_progress: 1 });
      } finally {
        release.resolve();
        await Promise.allSettled([first, second]);
        await Promise.all([winnerPool.end(), waiterPool.end()]);
      }
    });
  }

  for (const beforeCommit of [false, true]) {
    test(`real process termination ${beforeCommit ? 'before commit rolls back' : 'after commit recovers a lost response'} on restart`, async () => {
      const command = makeCommand();
      const child = fork(fileURLToPath(new URL('../support/crash-command.ts', import.meta.url)), [], {
        execArgv: ['--import', 'tsx'], env: { ...process.env, TAWSEL_CRASH_TEST_URL: db.url },
        stdio: ['ignore', 'ignore', 'pipe', 'ipc'], windowsHide: true
      });
      const exited = once(child, 'exit');
      const message = once(child, 'message');
      const stderr: Buffer[] = [];
      child.stderr?.on('data', (chunk: Buffer) => { stderr.push(chunk); });
      try {
        child.send({ command, beforeCommit });
        const barrier = await Promise.race([
          message.then(([value]) => value as { barrier?: string; error?: string }),
          exited.then(() => { throw new Error(`Child exited before barrier: ${Buffer.concat(stderr).toString()}`); })
        ]);
        expect(barrier).toEqual(beforeCommit ? { barrier: 'before-commit', backendPid: expect.any(Number) } : { barrier: 'committed-before-response' });
        child.kill('SIGKILL');
        await exited;
        const restartedPool = createDatabasePool(db.config);
        try {
          const recovered = await getCommandResult(restartedPool, scopeA, command.actionId);
          expect(recovered === null).toBe(beforeCommit);
          let executed = false;
          const hooks = fixtureHooks(command);
          const retried = await executeCommand(restartedPool, scopeA, command, {
            ...hooks, async writeDomain(tx, input, scope) { executed = true; return hooks.writeDomain(tx, input, scope); }
          });
          expect(executed).toBe(beforeCommit);
          if (!beforeCommit) expect(retried).toEqual(recovered);
          expect((await facts(restartedPool, command)).kernel_test_state).toBe(1);
          expect((await facts(restartedPool, command)).outbox_intents).toBe(1);
        } finally { await restartedPool.end(); }
      } finally {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        await exited;
      }
    });
  }

  test('compaction retains 30-day responses, unresolved work and lifetime identities', async () => {
    const recent = makeCommand();
    const old = makeCommand();
    const pending = makeCommand();
    const review = makeCommand();
    const held = makeCommand();
    const rejected = makeCommand();
    const original = await executeCommand(db.pool, scopeA, old, fixtureHooks(old, scopeA, { noIntent: true }));
    await executeCommand(db.pool, scopeA, recent, fixtureHooks(recent, scopeA, { noIntent: true }));
    await executeCommand(db.pool, scopeA, pending, fixtureHooks(pending));
    await executeCommand(db.pool, scopeA, review, fixtureHooks(review, scopeA, { review: true }));
    await executeCommand(db.pool, scopeA, held, fixtureHooks(held, scopeA, { noIntent: true, hold: true }));
    await executeCommand(db.pool, scopeA, rejected, fixtureHooks(rejected, scopeA, { reject: true }));
    // Test fixture ages only its owned rows. Production compaction uses DB time.
    await db.pool.query("UPDATE tawsel.command_identities SET finalized_at=clock_timestamp()-interval '31 days' WHERE action_id=ANY($1::uuid[])",
      [[old, pending, review, held, rejected].map(c => c.actionId)]);
    expect(await compactCommandResponses(db.pool)).toBe(2);
    const compact = await getCommandResult(db.pool, scopeA, old.actionId);
    expect(compact).toEqual({ receipt: original.receipt, operationId: original.operationId, summary: original.summary, retention: 'compacted' });
    expect(await executeCommand(db.pool, scopeA, old, fixtureHooks(old))).toEqual(compact);
    await expect(executeCommand(db.pool, scopeA, { ...old, payload: { ...old.payload, amount: 2 } }, fixtureHooks(old))).rejects.toMatchObject({ code: 'idempotency_conflict' });
    for (const command of [recent, pending, review, held]) {
      expect((await getCommandResult(db.pool, scopeA, command.actionId))?.retention).toBe('full');
    }
    expect((await getCommandResult(db.pool, scopeA, rejected.actionId))?.retention).toBe('compacted');
    expect((await facts(db.pool, rejected)).command_evidence).toBe(1);
    expect((await facts(db.pool, old)).kernel_test_state).toBe(1);
    expect((await facts(db.pool, pending)).outbox_intents).toBe(1);
  });

  test('database foreign keys reject a cross-tenant recipient and rollback the entire command', async () => {
    const recipient = randomUUID();
    await db.pool.query("INSERT INTO tawsel.command_sources VALUES ($1,$2,'integration')", [tenantB, recipient]);
    const command = makeCommand();
    const hooks = fixtureHooks(command);
    await expect(executeCommand(db.pool, scopeA, command, { ...hooks, async writeDomain(tx, input, scope) {
      const decision = await hooks.writeDomain(tx, input, scope);
      if (decision.status === 'accepted') decision.intents[0]!.recipientId = recipient;
      return decision;
    } })).rejects.toMatchObject({ code: '23503' });
    expect(Object.values(await facts(db.pool, command))).toEqual([0,0,0,0,0,0]);
  });

  test('a deferred constraint rejects a resultless acquisition at the actual COMMIT boundary', async () => {
    const command = makeCommand();
    await expect(withTransaction(db.pool, async tx => {
      await tx.query(`INSERT INTO tawsel.command_identities
        (tenant_id,source_id,action_id,operation_id,payload_hash,receipt_id,business_status)
        VALUES ($1,$2,$3,'test.increment',$4,$5,'pending')`,
      [scopeA.tenantId, scopeA.sourceId, command.actionId, '0'.repeat(64), randomUUID()]);
    })).rejects.toMatchObject({ code: '23514' });
    expect(await getCommandResult(db.pool, scopeA, command.actionId)).toBeNull();
  });

  test('a disconnected checked-out connection aborts waiting work and is safely discarded', async () => {
    const command = makeCommand();
    const entered = deferred<number>();
    const execution = executeCommand(db.pool, scopeA, command, { ...fixtureHooks(command), async afterWrite(stage, tx) {
      if (stage === 'domain') {
        entered.resolve((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid as number);
        await new Promise(() => { /* Deliberately wait for the database disconnect. */ });
      }
    } }).then(value => ({ value }), error => ({ error }));
    const pid = await entered.promise;
    await db.pool.query('SELECT pg_terminate_backend($1)', [pid]);
    expect(await execution).toHaveProperty('error');
    expect(Object.values(await facts(db.pool, command))).toEqual([0,0,0,0,0,0]);
    await executeCommand(db.pool, scopeA, command, fixtureHooks(command));
    expect((await facts(db.pool, command)).kernel_test_state).toBe(1);
  });

  test('caller mutation during acquisition cannot change the hashed feature input', async () => {
    const command = makeCommand();
    const original = structuredClone(command);
    const entered = deferred();
    const release = deferred();
    const result = executeCommand(db.pool, scopeA, command, { ...fixtureHooks(command), async afterWrite(stage) {
      if (stage === 'identity') { entered.resolve(); await release.promise; }
    } });
    await entered.promise;
    try { command.payload.amount = 9; } finally { release.resolve(); }
    expect((await result).summary.value).toBe(1);
    expect((await executeCommand(db.pool, scopeA, original, fixtureHooks(original))).summary.value).toBe(1);
    await expect(executeCommand(db.pool, scopeA, command, fixtureHooks(command))).rejects.toMatchObject({ code: 'idempotency_conflict' });
  });

  test('invariant locks use the same canonical order for reversed lists and UUID casing', async () => {
    const firstPool = createDatabasePool(db.config);
    const secondPool = createDatabasePool(db.config);
    const locks = [{ kind: 'driver' as const, id: randomUUID() }, { kind: 'task' as const, id: randomUUID() }];
    const entered = deferred<number>();
    const release = deferred();
    const secondPid = (await secondPool.query('SELECT pg_backend_pid() AS pid')).rows[0].pid as number;
    const first = withTransaction(firstPool, async tx => {
      await lockInvariants(tx, scopeA.tenantId, [locks[0]!]);
      entered.resolve((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid as number);
      await release.promise;
    });
    const firstPid = await entered.promise;
    const second = withTransaction(secondPool, async tx => {
      await lockInvariants(tx, scopeA.tenantId.toUpperCase(), [...locks].reverse().map(lock => ({ ...lock, id: lock.id.toUpperCase() })));
    });
    try {
      await observeDatabaseBlock(db.pool, secondPid, firstPid);
      // A reverse-order implementation would already hold task while waiting on
      // driver. Prove it has NOT acquired task before the lower-ranked guard.
      await withTransaction(db.pool, async tx => {
        const probe = await tx.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1, 18005)) AS acquired',
          [JSON.stringify([scopeA.tenantId, 'task', locks[1]!.id])]);
        expect(probe.rows[0].acquired).toBe(true);
      });
    }
    finally { release.resolve(); await Promise.all([first, second]); await Promise.all([firstPool.end(), secondPool.end()]); }
  });
});
