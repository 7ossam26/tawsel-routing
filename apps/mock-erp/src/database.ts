import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {Pool,type PoolClient} from 'pg';
import type {ReceiverConfig} from './config.js';
export function receiverPool(url=process.env.MOCK_ERP_DATABASE_URL){
 if(!url)throw new Error('MOCK_ERP_DATABASE_URL required; Tawsel database configuration is never used');
 const u=new URL(url);if(!/^\/mock_erp_[a-z0-9_]+$/.test(u.pathname))throw new Error('Dedicated mock_erp_ database required');
 return new Pool({connectionString:url,max:4,connectionTimeoutMillis:5000,application_name:'external-mock-erp'});
}
export async function transaction<T>(pool:Pool,work:(tx:PoolClient)=>Promise<T>){
 const tx=await pool.connect();let broken=false;
 const disconnected=()=>{broken=true;};tx.on('error',disconnected);
 try{await tx.query('BEGIN');await tx.query("SET LOCAL synchronous_commit=on; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='15s'; SET LOCAL idle_in_transaction_session_timeout='15s'");const value=await work(tx);const commit=await tx.query('COMMIT');if(broken||commit.command!=='COMMIT')throw new Error('Receiver commit unavailable');return value;}
 catch(e){try{if(!broken)await tx.query('ROLLBACK');}catch{broken=true;}throw e;}finally{tx.removeListener('error',disconnected);tx.release(broken);}
}
export async function assertRole(pool:Pool){
 const r=(await pool.query(`SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,
  shobj_description(d.oid,'pg_database') marker,pg_get_userbyid(datdba)=current_user owns
  FROM pg_roles r CROSS JOIN pg_database d WHERE r.rolname=current_user AND d.datname=current_database()`)).rows[0];
 if(!r||r.rolsuper||r.rolcreatedb||r.rolcreaterole||r.rolreplication||r.rolbypassrls||!r.owns||r.marker!=='tawsel:external-mock-erp:v1')throw new Error('Receiver requires a marked isolated database and restricted owner role');
 if((await pool.query('SELECT 1 FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user)')).rowCount)throw new Error('Receiver role must not inherit or assume other roles');
 if((await pool.query("SELECT 1 FROM pg_namespace WHERE nspname='tawsel'")).rowCount)throw new Error('Tawsel schema forbidden in receiver database');
}
export async function migrateReceiver(pool:Pool,c:Pick<ReceiverConfig,'tenantId'|'integrationId'>){
 await assertRole(pool);
 return transaction(pool,async tx=>{
  await tx.query('SELECT pg_advisory_xact_lock(26001,1)');
  await tx.query('CREATE SCHEMA IF NOT EXISTS mock_erp; CREATE TABLE IF NOT EXISTS mock_erp.migrations(name text PRIMARY KEY,hash text NOT NULL)');
  const directory=new URL('../migrations/',import.meta.url),names=(await readdir(directory)).filter(n=>n.endsWith('.sql')).sort();
  const applied=(await tx.query<{name:string;hash:string}>('SELECT * FROM mock_erp.migrations ORDER BY name')).rows;
  if(applied.length>names.length)throw new Error('Unsupported receiver migration history');
  for(const [i,name] of names.entries()){
   const sql=(await readFile(new URL(name,directory),'utf8')).replaceAll('\r\n','\n'),hash=createHash('sha256').update(sql).digest('hex');
   if(applied[i]){if(applied[i]!.name!==name||applied[i]!.hash!==hash)throw new Error('Receiver migration changed');continue;}
   await tx.query(sql);await tx.query('INSERT INTO mock_erp.migrations VALUES($1,$2)',[name,hash]);
  }
  await tx.query('INSERT INTO mock_erp.scope(singleton,tenant_id,integration_id) VALUES(true,$1,$2) ON CONFLICT DO NOTHING',[c.tenantId,c.integrationId]);
  const s=(await tx.query('SELECT * FROM mock_erp.scope')).rows[0];
  if(s.tenant_id!==c.tenantId||s.integration_id!==c.integrationId)throw new Error('Receiver database belongs to another recipient');
 });
}
export async function lockReceiver(tx:PoolClient){await tx.query('SELECT singleton FROM mock_erp.scope FOR UPDATE');}
