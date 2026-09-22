import { setTimeout } from 'node:timers/promises';
import { createDatabasePool } from '../apps/api/src/db/pool.js';
import { parseDatabaseConfig } from '../apps/api/src/db/config.js';
import { assertMigrationsCurrent } from '../apps/api/src/db/migrate.js';
import { RoutingEngine } from '../apps/api/src/engine/index.js';
import { runPlanningOnce } from '../apps/api/src/planning/worker.js';

const pool=createDatabasePool(parseDatabaseConfig(process.env.TAWSEL_DATABASE_URL,'application'));
const engine=new RoutingEngine(),stop=new AbortController();
process.on('SIGINT',()=>stop.abort());process.on('SIGTERM',()=>stop.abort());
try {
 await assertMigrationsCurrent(pool);
 do {
  const worked=await runPlanningOnce(pool,engine,{signal:stop.signal});
  if(process.argv.includes('--once')){console.log(worked?'Durable planning work processed; poll job for actual outcome.':'No due planning job.');break;}
  if(!worked)await setTimeout(1000);
 }while(!stop.signal.aborted);
}finally{await pool.end();}
