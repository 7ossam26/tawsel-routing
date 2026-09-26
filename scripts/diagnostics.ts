import {DiagnosticsClient} from '../packages/api-client/src/diagnostics.js';
const baseUrl=process.env.TAWSEL_DIAGNOSTICS_URL??'http://127.0.0.1:3001',operatorToken=process.env.TAWSEL_DIAGNOSTICS_TOKEN;
if(!operatorToken)throw new Error('Set the dedicated TAWSEL_DIAGNOSTICS_TOKEN in the operator environment.');
const url=new URL(baseUrl);if(url.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Use TLS or an authenticated loopback tunnel for operator diagnostics.');
const client=new DiagnosticsClient({baseUrl,operatorToken});
try{
 if(process.argv[2]==='trace'){
  const [tenant,source,action]=process.argv.slice(3);if(!tenant||!source||!action)throw new Error('Usage: diagnostics.ts trace TENANT_UUID SOURCE_UUID ACTION_UUID');
  const trace=await client.trace(tenant,source,action);
  console.log(JSON.stringify(trace,null,2));
  console.log('Compare each recipient sequence with last reported applied_through and reported_at. Received alone is not applied; inspect the receiver status when the report is missing/stale.');
 }else{
  const [health,before]=await Promise.all([client.health(),client.metrics()]);
  if(process.argv.includes('--json'))console.log(JSON.stringify({health,metrics:before},null,2));
  else{
   await new Promise(r=>setTimeout(r,1000));const after=await client.metrics();
   const seconds=after.uptimeSeconds-before.uptimeSeconds,cpu=(after.process.cpuMicroseconds.user+after.process.cpuMicroseconds.system-before.process.cpuMicroseconds.user-before.process.cpuMicroseconds.system)/1e6/seconds;
   console.table([{area:'API',state:health.liveness,detail:'Liveness only'},{area:'Database',state:health.database.state,detail:health.database.state==='ready'?`${health.database.blocked} blocked; ${health.database.deadlocks} deadlocks; size ${health.database.bytes === null ? 'unavailable' : `${health.database.bytes} bytes`}`:'Inspect PostgreSQL/connection wait before restarting commands'},
    {area:'Sender',state:health.sender?`${health.sender.pending+health.sender.sending+health.sender.failed} outstanding`:'unknown',detail:health.sender?`oldest ${Math.round(health.sender.oldest_ms)} ms; failed ${health.sender.failed}; expired leases ${health.sender.expired_leases}`:''},
    {area:'Receiver',state:health.projection?`${health.projection.unapplied_or_unreported} unapplied or unreported`:'unknown',detail:`Missing/stale report is not proof of failed application`},
    {area:'Engine',state:health.engine.availability,detail:'Run engine:live separately; stored outcomes remain valid'},
    {area:'Backup',state:health.backup.readiness,detail:'Require an isolated verified restore; Phase 40'},
    {area:'API resources',state:`${cpu.toFixed(2)} CPU cores over ${seconds.toFixed(2)} s`,detail:`RSS ${after.process.memory.rss}; pool ${after.pool.total-after.pool.idle}/${after.pool.max} busy; ${after.pool.waiting} waiting; disk free ${after.disk?.availableBytes??'unknown'}`}]);
   console.table(health.workers??[]);console.table(after.metrics);
   console.log('Scope: deployment operator; host aggregates contain no tenant payloads. Process percentiles are rolling diagnostics, not a freshness/capacity pass.');
  }
 }
}catch{process.stderr.write('Diagnostics unavailable. Check operator credential, endpoint and readiness; no secret-bearing exception is printed.\n');process.exitCode=1;}
