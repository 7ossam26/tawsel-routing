// Explicit local demonstration data, never an ERP provisioning endpoint.
import { createDatabasePool } from '../apps/api/src/db/pool.js';
import { parseDatabaseConfig } from '../apps/api/src/db/config.js';
import { withTransaction } from '../apps/api/src/db/transaction.js';
import { assertMigrationsCurrent } from '../apps/api/src/db/migrate.js';
const config = parseDatabaseConfig(process.env.TAWSEL_DATABASE_URL, 'application');
if (!['localhost', '127.0.0.1'].includes(config.host ?? '') || process.env.TAWSEL_COMPANY_ISSUER !== 'http://localhost:8085/realms/tawsel-company') throw new Error('Demo seed requires dedicated local identity configuration');
const pool = createDatabasePool(config);
const id = (n: number) => `70000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
try {
  await assertMigrationsCurrent(pool);
  await withTransaction(pool, async tx => {
    const tenant = id(100), account = id(101), role = id(102), branch = id(103), driver = id(104);
    await tx.query('INSERT INTO tawsel.tenant_keys VALUES ($1) ON CONFLICT DO NOTHING', [tenant]);
    await tx.query("INSERT INTO tawsel.tenants (tenant_id,kind) VALUES ($1,'company') ON CONFLICT DO NOTHING", [tenant]);
    await tx.query("INSERT INTO tawsel.command_sources VALUES ($1,$2,'account') ON CONFLICT DO NOTHING", [tenant, account]);
    await tx.query("INSERT INTO tawsel.accounts (tenant_id,account_id,tenant_kind) VALUES ($1,$2,'company') ON CONFLICT DO NOTHING", [tenant, account]);
    await tx.query("INSERT INTO tawsel.roles (tenant_id,role_id,name) VALUES ($1,$2,'Local demo driver') ON CONFLICT DO NOTHING", [tenant, role]);
    await tx.query("INSERT INTO tawsel.role_capabilities VALUES ($1,$2,'execution.own',true) ON CONFLICT DO NOTHING", [tenant, role]);
    await tx.query("INSERT INTO tawsel.memberships (tenant_id,account_id,tenant_kind,role_id) VALUES ($1,$2,'company',$3) ON CONFLICT DO NOTHING", [tenant, account, role]);
    await tx.query('INSERT INTO tawsel.branches (tenant_id,branch_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [tenant, branch]);
    await tx.query('INSERT INTO tawsel.membership_branches VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [tenant, account, branch]);
    await tx.query('INSERT INTO tawsel.drivers (tenant_id,driver_id,account_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [tenant, driver, account]);
    await tx.query('INSERT INTO tawsel.identity_subjects (issuer,subject,tenant_id,account_id) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [process.env.TAWSEL_COMPANY_ISSUER, id(1), tenant, account]);
    await tx.query("INSERT INTO tawsel.company_login_codes VALUES ('LOCAL',$1,'شركة التجربة المحلية') ON CONFLICT DO NOTHING", [tenant]);
  });
  console.log('Local demonstration company LOCAL / driver ready. No outsider membership provisioned.');
} finally { await pool.end(); }
