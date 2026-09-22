import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createTestDatabase } from '../support/database.js';
import { ids, prepareAccessFixture, principals } from '../support/access-fixture.js';
import { withAccess, type ResourcePolicy, type ResourceScope } from '../../src/access/service.js';
import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const policy: ResourcePolicy = [{ capability: 'planning.manage', ownership: 'assigned-branches' }];

describe('P06 effective access from actual PostgreSQL role and membership rows', () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  beforeEach(async () => { db = await createTestDatabase(); await prepareAccessFixture(db.pool); });
  afterEach(async () => { await db?.close(); });
  const capabilities = () => withAccess(db.pool, principals.staff, async a => a.effectiveCapabilities);

  test('role edits change inherited grants; direct allow and deny persist, inherit follows live role', async () => {
    expect(await capabilities()).toContain('planning.manage');
    await db.pool.query("INSERT INTO tawsel.user_capability_exceptions VALUES ($1,$2,'planning.manage','deny'),($1,$2,'location.review','allow'),($1,$2,'reports.read','inherit')", [ids.tenant, ids.staff]);
    expect(await capabilities()).not.toContain('planning.manage');
    expect(await capabilities()).toContain('location.review');
    await db.pool.query('UPDATE tawsel.role_capabilities SET allowed=false WHERE tenant_id=$1 AND role_id=$2', [ids.tenant, ids.role]);
    expect(await capabilities()).toEqual(['location.review']);
    await db.pool.query('UPDATE tawsel.role_capabilities SET allowed=true WHERE tenant_id=$1 AND role_id=$2', [ids.tenant, ids.role]);
    const current = await capabilities();
    expect(current).toContain('reports.read');
    expect(current).toContain('location.review');
    expect(current).not.toContain('planning.manage');
    await db.pool.query("UPDATE tawsel.user_capability_exceptions SET effect='inherit' WHERE tenant_id=$1 AND account_id=$2 AND capability='planning.manage'", [ids.tenant, ids.staff]);
    expect(await capabilities()).toContain('planning.manage');
  });

  test('identical capabilities in two branches, explicit denial in both, third branch excluded', async () => {
    await withAccess(db.pool, principals.staff, async (a, tx) => {
      const rows = await tx.query<ResourceScope>('SELECT * FROM public.authorization_test_records WHERE resource_id=ANY($1::uuid[]) ORDER BY resource_id', [[ids.record, ids.secondBranchRecord, ids.forbiddenRecord]]);
      expect(a.branchIds).toEqual([ids.branch, ids.secondBranch]);
      expect(rows.rows.map(r => a.canRead(policy, r))).toEqual([true, false, true]);
    });
    await db.pool.query("INSERT INTO tawsel.user_capability_exceptions VALUES ($1,$2,'planning.manage','deny')", [ids.tenant, ids.staff]);
    await withAccess(db.pool, principals.staff, async (a, tx) => {
      const rows = await tx.query<ResourceScope>('SELECT * FROM public.authorization_test_records WHERE resource_id=ANY($1::uuid[])', [[ids.record, ids.secondBranchRecord]]);
      expect(rows.rows.every(r => !a.canRead(policy, r))).toBe(true);
      expect(() => a.requireCapability(policy)).toThrow('Access unavailable');
    });
  });

  test('Admin role label grants nothing and an explicit grant cannot bypass lifecycle', async () => {
    await db.pool.query('UPDATE tawsel.memberships SET role_id=$1 WHERE account_id=$2', [ids.emptyAdminRole, ids.staff]);
    expect(await capabilities()).toEqual([]);
    await db.pool.query("INSERT INTO tawsel.user_capability_exceptions VALUES ($1,$2,'planning.manage','allow')", [ids.tenant, ids.staff]);
    await withAccess(db.pool, principals.staff, async (a, tx) => {
      const row = (await tx.query<ResourceScope>('SELECT * FROM public.authorization_test_records WHERE resource_id=$1', [ids.record])).rows[0]!;
      expect(a.requireOperation(policy, row, () => true)).toBe(row);
      expect(() => a.requireOperation(policy, row, () => false)).toThrow('current state');
    });
  });

  test('disabled membership and issuer mismatch fail closed; expired access cannot be reused', async () => {
    const stale = await withAccess(db.pool, principals.staff, async a => a);
    expect(() => stale.requireCapability(policy)).toThrow('session has ended');
    await expect(withAccess(db.pool, { ...principals.staff, issuer: 'https://wrong.fixture.invalid' }, async a => a.commandScope)).rejects.toThrow('Access unavailable');
    await db.pool.query('UPDATE tawsel.memberships SET enabled=false WHERE account_id=$1', [ids.staff]);
    await expect(capabilities()).rejects.toThrow('Access unavailable');
  });

  test('actual account/personal/integration access contexts satisfy the public schema and cannot mutate authority', async () => {
    const ajv = new Ajv2020({ strict: true });
    (addFormats as unknown as (instance: Ajv2020) => void)(ajv);
    ajv.addSchema(JSON.parse(readFileSync(new URL('../../../../contracts/common.schema.json', import.meta.url), 'utf8')));
    const validate = ajv.getSchema('https://schemas.tawsel.invalid/v1/common.schema.json#/$defs/AccessContext')!;
    for (const principal of [principals.staff, principals.personal, principals.integration]) {
      await withAccess(db.pool, principal, async access => {
        const view = access.context;
        expect(validate(view), ajv.errorsText(validate.errors)).toBe(true);
        view.branchIds.push(ids.otherBranch);
        view.effectiveCapabilities.length = 0;
        expect(access.branchIds).not.toContain(ids.otherBranch);
        expect(access.effectiveCapabilities.length).toBeGreaterThan(0);
      });
    }
  });
});
