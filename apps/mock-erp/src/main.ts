import {readConfig} from './config.js';
import {receiverPool,migrateReceiver,assertReceiverMigrationsCurrent} from './database.js';
import {receiverApp} from './app.js';
import {runReceiverWorkerOnce,reconcileStream,reportCheckpoint} from './recovery.js';
import {conforms} from './inbox.js';
import type {components} from '@tawsel/api-client';
import {readFile} from 'node:fs/promises';
import {saveSource,sourceStatus,runSourceOnce,type SourceSubmission} from './source.js';
const config=readConfig(),pool=receiverPool();
if(process.env.MOCK_ERP_MANAGED_MIGRATIONS==='true'&&process.argv[2]!=='migrate')await assertReceiverMigrationsCurrent(pool,config);
else await migrateReceiver(pool,config);
if(process.argv[2]==='migrate'){await pool.end();console.log('External mock ERP migrations current');}
else if(process.argv[2]==='source-submit'){
 const file=process.argv[3];if(!file)throw new Error('Usage: main.js source-submit <submission.json>');
 console.log(JSON.stringify(await saveSource(pool,config,'local-connector-operator',JSON.parse(await readFile(file,'utf8')) as SourceSubmission)));await pool.end();
}
else if(process.argv[2]==='source-status'){console.log(JSON.stringify(await sourceStatus(pool)));await pool.end();}
else if(process.argv[2]==='source-worker'){
 let stopped=false;process.once('SIGTERM',()=>{stopped=true;});process.once('SIGINT',()=>{stopped=true;});
 do{try{await runSourceOnce(pool,config);}catch{console.error('Mock ERP source unavailable; durable commands retained');}
  if(process.argv.includes('--once'))break;if(!stopped)await new Promise(r=>setTimeout(r,1000));
 }while(!stopped);await pool.end();
}
else if(process.argv[2]==='worker'){
 let stopped=false;process.once('SIGTERM',()=>{stopped=true;});process.once('SIGINT',()=>{stopped=true;});
 do{try{await runReceiverWorkerOnce(pool,config);}catch{console.error('Mock ERP worker unavailable; durable inbox retained');}
  if(process.argv.includes('--once'))break;if(!stopped)await new Promise(r=>setTimeout(r,1000));
 }while(!stopped);await pool.end();
}
else if(process.argv[2]==='reconcile'){
 const aggregate={type:process.argv[3],id:process.argv[4]};if(!conforms('consumer.schema.json#/$defs/Aggregate',aggregate))throw new Error('Usage: main.js reconcile <aggregateType> <aggregateId>');
 const a=aggregate as components['schemas']['ConsumerAggregate'];console.log(JSON.stringify((await reconcileStream(pool,config,a)).checkpoint));await reportCheckpoint(pool,config,a);await pool.end();
}
else{
 const app=receiverApp(pool,config);await app.listen({host:config.host,port:config.port});
 console.log(JSON.stringify({service:'external-mock-erp',address:app.server.address()}));
 const stop=async()=>{await app.close();await pool.end();};process.once('SIGTERM',()=>void stop());process.once('SIGINT',()=>void stop());
}
