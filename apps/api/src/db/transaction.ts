import type { Pool, PoolClient } from 'pg';
import { measure } from '../diagnostics/telemetry.js';
import { committed } from '../diagnostics/commit-clock.js';

// Hooks receive SQL access, never pool/release/commit ownership. Callbacks must
// await every query and must not issue transaction control or do network work.
export type Transaction = Pick<PoolClient, 'query'>;

export async function withTransaction<T>(pool: Pool, work: (tx: Transaction) => Promise<T>, isolation: 'READ COMMITTED' | 'REPEATABLE READ' = 'READ COMMITTED'): Promise<T> {
  const began=performance.now();
  const client = await pool.connect().catch(error=>{measure('poolWait',performance.now()-began,true);throw error;});
  measure('poolWait',performance.now()-began);
  let failed=false;
  let destroy = false;
  let rejectDisconnected!: (error: Error) => void;
  const disconnected = new Promise<never>((_resolve, reject) => { rejectDisconnected = reject; });
  const onError = (error: Error) => { destroy = true; rejectDisconnected(error); };
  client.on('error', onError);
  try {
    return await Promise.race([disconnected, (async () => {
      await client.query(`BEGIN ISOLATION LEVEL ${isolation}`);
      await client.query("SET LOCAL synchronous_commit = on");
      await client.query("SET LOCAL lock_timeout = '3s'");
      await client.query("SET LOCAL statement_timeout = '10s'");
      await client.query("SET LOCAL idle_in_transaction_session_timeout = '10s'");
      await client.query("SET LOCAL transaction_timeout = '15s'");
      const query:Transaction['query']=((...args: unknown[])=>{
        const started=performance.now();
        const pending=Reflect.apply(client.query,client,args) as Promise<unknown>;
        return pending.then(value=>{measure('query',performance.now()-started);return value;},error=>{measure('query',performance.now()-started,true);throw error;});
      }) as Transaction['query'];
      const result = await work({ query });
      const commitStart=performance.now();
      const commit = await client.query('COMMIT');
      measure('commit',performance.now()-commitStart);
      if (commit.command !== 'COMMIT') throw new Error('Transaction aborted before commit');
      committed({beforeMs:performance.timeOrigin+commitStart,afterMs:performance.timeOrigin+performance.now()});
      return result;
    })()]);
  } catch (error) {
    failed=true;
    if (!destroy) {
      try { await client.query('ROLLBACK'); } catch { destroy = true; }
    }
    // A failed/uncertain COMMIT is never retried here. Caller retries the same ID.
    throw error;
  } finally {
    measure('transaction',performance.now()-began,failed);
    client.removeListener('error', onError);
    client.release(destroy);
  }
}
