import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {Pool} from 'pg';
/** Administrative test/setup harness only; never shipped to the consumer. */
export async function createReceiverDatabase(){
 const raw=process.env.TAWSEL_TEST_ADMIN_URL;if(!raw)throw new Error('Run npm run db:local:start');
 const u=new URL(raw);if(u.pathname!=='/tawsel_test_control')throw new Error('Marked test-control database required');
 const admin=new Pool({connectionString:raw,max:1});
 const marker=(await admin.query("SELECT shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()")).rows[0];
 if(marker?.marker!=='tawsel:test-control:v1'){await admin.end();throw new Error('Unmarked test control');}
 const suffix=randomUUID().replaceAll('-',''),name=`mock_erp_${suffix}`,role=`mock_erp_role_${suffix}`,password=randomBytes(32).toString('hex');
 let created=false;
 try{
  await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
  await admin.query(`CREATE DATABASE ${name} OWNER ${role}`);created=true;
  await admin.query(`COMMENT ON DATABASE ${name} IS 'tawsel:external-mock-erp:v1'`);
  await admin.query(`REVOKE ALL ON DATABASE ${name} FROM PUBLIC`);
  // CONNECT may be allowed by a cluster's PUBLIC defaults; no Tawsel schema/table
  // grants or memberships are conferred. Tests prove table reads fail.
  const url=new URL(raw);url.username=role;url.password=password;url.pathname=`/${name}`;
  const pool=new Pool({connectionString:url.href,max:4});let closed=false;
  return {url:url.href,pool,role,async close(){if(closed)return;closed=true;try{await pool.end();await admin.query(`DROP DATABASE ${name}`);await admin.query(`DROP ROLE ${role}`);}finally{await admin.end();}},async detach(){await pool.end();await admin.end();}};
 }catch(e){try{if(created)await admin.query(`DROP DATABASE ${name}`);await admin.query(`DROP ROLE IF EXISTS ${role}`);}finally{await admin.end();}throw e;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const db=await createReceiverDatabase();await mkdir('.local',{recursive:true});await writeFile('.local/mock-erp.database.env',`MOCK_ERP_DATABASE_URL=${db.url}\n`);await db.detach();console.log('Created restricted receiver database; configuration .local/mock-erp.database.env (contains credentials)');
}
