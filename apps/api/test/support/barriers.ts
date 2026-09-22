import { setImmediate } from 'node:timers/promises';
import type { Pool } from 'pg';

export function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

export async function observeDatabaseBlock(pool: Pool, waitingPid: number, holderPid: number) {
  const deadline = performance.now() + 2500;
  while (performance.now() < deadline) {
    const observed = await pool.query<{ blocked: boolean }>('SELECT $2::integer = ANY(pg_blocking_pids($1)) AS blocked', [waitingPid, holderPid]);
    if (observed.rows[0]?.blocked) return;
    await setImmediate();
  }
  throw new Error(`No observed PostgreSQL lock barrier between ${waitingPid} and ${holderPid}`);
}
