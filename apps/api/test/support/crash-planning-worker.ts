import { createDatabasePool } from '../../src/db/pool.js';
import { parseDatabaseConfig } from '../../src/db/config.js';
import { RoutingEngine } from '../../src/engine/index.js';
import { loadEngineConfig } from '../../src/engine/config.js';
import { runPlanningOnce } from '../../src/planning/worker.js';
const pool=createDatabasePool(parseDatabaseConfig(process.env.TAWSEL_CRASH_TEST_URL,'test'));
try {
 await runPlanningOnce(pool,new RoutingEngine(loadEngineConfig({TAWSEL_VROOM_URL:process.env.TAWSEL_FIXTURE_VROOM_URL,TAWSEL_ENGINE_TIMEOUT_MS:'10000'})),{leaseMs:2000});
}finally{await pool.end();}
