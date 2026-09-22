import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createTestDatabase } from '../support/database.js';
import { ids, prepareAccessFixture } from '../support/access-fixture.js';

describe('P06 real PostgreSQL scoped membership constraints', () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  const unlinkedAccount = randomUUID();
  beforeAll(async () => {
    db = await createTestDatabase(); await prepareAccessFixture(db.pool);
    await db.pool.query("INSERT INTO tawsel.command_sources VALUES ($1,$2,'account')", [ids.otherTenant, unlinkedAccount]);
    await db.pool.query("INSERT INTO tawsel.accounts (tenant_id,account_id,tenant_kind) VALUES ($1,$2,'company')", [ids.otherTenant, unlinkedAccount]);
  });
  afterAll(async () => { await db?.close(); });

  test.each([
    ['membership branch', 'INSERT INTO tawsel.membership_branches VALUES ($1,$2,$3)', [ids.tenant, ids.staff, ids.otherBranch]],
    ['membership role', 'UPDATE tawsel.memberships SET role_id=$3 WHERE tenant_id=$1 AND account_id=$2', [ids.tenant, ids.staff, ids.otherRole]],
    ['driver account', 'INSERT INTO tawsel.drivers (tenant_id,driver_id,account_id) VALUES ($1,$2,$3)', [ids.tenant, randomUUID(), ids.otherAccount]],
    ['subject account', "INSERT INTO tawsel.identity_subjects VALUES ('fixture','cross-tenant',$1,$2,true)", [ids.tenant, unlinkedAccount]],
    ['integration branch', 'INSERT INTO tawsel.integration_branches VALUES ($1,$2,$3)', [ids.tenant, ids.integration, ids.otherBranch]],
    ['resource branch', 'UPDATE public.authorization_test_records SET branch_id=$3 WHERE tenant_id=$1 AND resource_id=$2', [ids.tenant, ids.record, ids.otherBranch]],
    ['resource driver', 'UPDATE public.authorization_test_records SET driver_id=$3 WHERE tenant_id=$1 AND resource_id=$2', [ids.tenant, ids.record, ids.otherDriver]],
    ['resource integration', 'UPDATE public.authorization_test_records SET integration_id=$3 WHERE tenant_id=$1 AND resource_id=$2', [ids.tenant, ids.record, ids.otherIntegration]],
    ['unknown capability', "INSERT INTO tawsel.role_capabilities VALUES ($1,$2,'super-admin',true)", [ids.tenant, ids.role]],
    ['account source kind', "INSERT INTO tawsel.accounts (tenant_id,account_id,tenant_kind) VALUES ($1,$2,'company')", [ids.tenant, ids.integration]]
  ])('rejects invalid %s with a foreign-key violation', async (_label, sql, values) => {
    await expect(db.pool.query(sql, values)).rejects.toMatchObject({ code: '23503' });
  });

  test('requires exactly one company role and no personal role/branch or integration execution grant', async () => {
    await expect(db.pool.query('UPDATE tawsel.memberships SET role_id=NULL WHERE account_id=$1', [ids.staff])).rejects.toMatchObject({ code: '23514' });
    await expect(db.pool.query('INSERT INTO tawsel.branches (tenant_id,branch_id) VALUES ($1,$2)', [ids.personalTenant, randomUUID()])).rejects.toMatchObject({ code: '23503' });
    await expect(db.pool.query("INSERT INTO tawsel.integration_capabilities VALUES ($1,$2,'execution.own')", [ids.tenant, ids.integration])).rejects.toMatchObject({ code: '23514' });
    await expect(db.pool.query("INSERT INTO tawsel.user_capability_exceptions VALUES ($1,$2,'monitor.read','maybe')", [ids.tenant, ids.staff])).rejects.toMatchObject({ code: '23514' });
  });

  test('retains unique immutable issuer/subject links and one separate personal account', async () => {
    await expect(db.pool.query("UPDATE tawsel.identity_subjects SET account_id=$1 WHERE subject='staff'", [ids.driverAccount])).rejects.toMatchObject({ code: '23514' });
    await expect(db.pool.query("DELETE FROM tawsel.identity_subjects WHERE subject='staff'")).rejects.toMatchObject({ code: '23514' });
    const extra = randomUUID();
    await db.pool.query("INSERT INTO tawsel.command_sources VALUES ($1,$2,'account')", [ids.personalTenant, extra]);
    await expect(db.pool.query("INSERT INTO tawsel.accounts (tenant_id,account_id,tenant_kind) VALUES ($1,$2,'personal')", [ids.personalTenant, extra])).rejects.toMatchObject({ code: '23505' });
    await expect(db.pool.query("INSERT INTO tawsel.identity_subjects VALUES ('https://issuer.fixture.invalid','staff',$1,$2,true)", [ids.personalTenant, ids.personalAccount])).rejects.toMatchObject({ code: '23505' });
  });

  test('database capability vocabulary matches the canonical public enum', async () => {
    const common = JSON.parse(await readFile(new URL('../../../../contracts/common.schema.json', import.meta.url), 'utf8'));
    const actual = await db.pool.query('SELECT capability FROM tawsel.capabilities ORDER BY capability');
    expect(actual.rows.map(r => r.capability)).toEqual([...common.$defs.Capability.enum].sort());
  });
});
