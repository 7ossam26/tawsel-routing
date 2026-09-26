import {setTimeout} from 'node:timers/promises';
import {createDatabasePool} from '../apps/api/src/db/pool.js';
import {parseDatabaseConfig} from '../apps/api/src/db/config.js';
import {assertMigrationsCurrent} from '../apps/api/src/db/migrate.js';
import {loadOutboxConfig} from '../apps/api/src/outbox/config.js';
import {runOutboxBatch} from '../apps/api/src/outbox/worker.js';
import {workerObservation} from '../apps/api/src/diagnostics/workers.js';
const config=loadOutboxConfig();if(!config)throw new Error('TAWSEL_OUTBOX_CONFIG_FILE is required');
const pool=createDatabasePool(parseDatabaseConfig(process.env.TAWSEL_DATABASE_URL,'application')),stop=new AbortController();
process.once('SIGINT',()=>stop.abort());process.once('SIGTERM',()=>stop.abort());
try{
 await assertMigrationsCurrent(pool);
 do{
  const started=performance.now();
  const count=await runOutboxBatch(pool,config,{signal:stop.signal,log:entry=>console.log(JSON.stringify(entry))});
  await workerObservation(pool,'outbox',count>0,performance.now()-started);
  if(process.argv.includes('--once'))break;
  if(count===0)await setTimeout(1000);
 }while(!stop.signal.aborted);
}catch{console.error('Outbox worker stopped; retained leases and events recover on restart.');process.exitCode=1;}
finally{await pool.end();}
