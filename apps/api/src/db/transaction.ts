import type { Pool, PoolClient } from 'pg';

// Hooks receive SQL access, never pool/release/commit ownership. Callbacks must
// await every query and must not issue transaction control or do network work.
export type Transaction = Pick<PoolClient, 'query'>;

export async function withTransaction<T>(pool: Pool, work: (tx: Transaction) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let destroy = false;
  let rejectDisconnected!: (error: Error) => void;
  const disconnected = new Promise<never>((_resolve, reject) => { rejectDisconnected = reject; });
  const onError = (error: Error) => { destroy = true; rejectDisconnected(error); };
  client.on('error', onError);
  try {
    return await Promise.race([disconnected, (async () => {
      await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
      await client.query("SET LOCAL synchronous_commit = on");
      await client.query("SET LOCAL lock_timeout = '3s'");
      await client.query("SET LOCAL statement_timeout = '10s'");
      await client.query("SET LOCAL idle_in_transaction_session_timeout = '10s'");
      await client.query("SET LOCAL transaction_timeout = '15s'");
      const result = await work({ query: client.query.bind(client) });
      const commit = await client.query('COMMIT');
      if (commit.command !== 'COMMIT') throw new Error('Transaction aborted before commit');
      return result;
    })()]);
  } catch (error) {
    if (!destroy) {
      try { await client.query('ROLLBACK'); } catch { destroy = true; }
    }
    // A failed/uncertain COMMIT is never retried here. Caller retries the same ID.
    throw error;
  } finally {
    client.removeListener('error', onError);
    client.release(destroy);
  }
}
