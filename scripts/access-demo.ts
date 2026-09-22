import assert from 'node:assert/strict';
import { createTestDatabase } from '../apps/api/test/support/database.js';
import { accessCommand, ids, prepareAccessFixture, principals, readFixture, runFixtureCommand } from '../apps/api/test/support/access-fixture.js';

const db = await createTestDatabase();
try {
  await prepareAccessFixture(db.pool);
  console.log('P06 demonstration: real disposable PostgreSQL; labelled authenticated-principal fixtures; synthetic resources, no OIDC or shipment API.');
  const rows = await readFixture(db.pool, principals.integration);
  assert.deepEqual(rows.map(r => r.resource_id), [ids.record, ids.otherDriverRecord]);
  console.log(`Source A sees ${rows.length} authorized records; source B, third branch, other tenant and personal tenant are excluded.`);
  const command = accessCommand();
  const accepted = await runFixtureCommand(db.pool, principals.integration, command);
  assert.equal(accepted.receipt.businessStatus, 'accepted');
  assert.deepEqual(await runFixtureCommand(db.pool, principals.integration, command), accepted);
  await assert.rejects(runFixtureCommand(db.pool, principals.integration, accessCommand(ids.secondRecord)), { code: 'forbidden_resource', statusCode: 404 });
  console.log('Allowed change committed once; duplicate retained; other-source operation denied with Resource unavailable.');
  await db.pool.query('UPDATE public.authorization_test_records SET departed=true WHERE resource_id=$1', [ids.record]);
  const rejected = await runFixtureCommand(db.pool, principals.integration, accessCommand());
  assert.equal(rejected.receipt.problem?.code, 'lifecycle_forbidden');
  await db.pool.query('UPDATE tawsel.integrations SET enabled=false WHERE integration_id=$1', [ids.integration]);
  await assert.rejects(readFixture(db.pool, principals.integration), { statusCode: 403 });
  console.log('Lifecycle rejection retained without a business change; disabling integration prevents further reads. PASS.');
} finally { await db.close(); console.log('Disposable demonstration database removed.'); }
