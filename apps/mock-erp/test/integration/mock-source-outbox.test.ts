import {expect,test} from 'vitest';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {intakeClient} from '@tawsel/api-client/intake';
import {receiverApp} from '../../src/app.js';
import {conforms} from '../../src/inbox.js';
import {saveSource,runSourceOnce,sourceStatus,sourceEnvelope} from '../../src/source.js';
import {sourceFixture,sourceSnapshot} from '../support/source-fixture.js';
async function crash(f:Awaited<ReturnType<typeof sourceFixture>>,submission?:object){
 const child=spawn(process.execPath,['--import','tsx','apps/mock-erp/test/support/crash-source.ts'],{windowsHide:true,stdio:['ignore','ignore','pipe'],env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,MOCK_ERP_DATABASE_URL:f.erp.url,MOCK_ERP_TEST_CONFIG:JSON.stringify(f.c),...(submission?{MOCK_ERP_TEST_SUBMISSION:JSON.stringify(submission)}:{})}});
 let error='';child.stderr.on('data',b=>error+=String(b));const [code]=await once(child,'exit');expect(code,error).toBe(submission?76:77);
}
test('A: source change and command commit together; failed local transaction leaves neither; duplicate/stale/conflicting identities are fenced',async()=>{
 const f=await sourceFixture();try{
  const input=f.submission('branch.provision',{externalId:'cairo',sourceRevision:1,name:'القاهرة',enabled:true,location:null},'branch','cairo');
  await expect(saveSource(f.erp.pool,f.c,'staff',input,{beforeCommit:async()=>{throw new Error('local commit fault');}})).rejects.toThrow('local commit fault');
  expect((await sourceStatus(f.erp.pool)).records).toHaveLength(0);expect((await sourceStatus(f.erp.pool)).commands).toHaveLength(0);
  const first=await saveSource(f.erp.pool,f.c,'staff',input);expect(first.status).toBe('pending');
  expect((await saveSource(f.erp.pool,f.c,'staff',input)).action_id).toBe(first.action_id);
  await expect(saveSource(f.erp.pool,f.c,'forged',input)).rejects.toMatchObject({code:'source_identity_conflict'});
  await expect(saveSource(f.erp.pool,f.c,'staff',{...input,command:{...input.command,actionId:randomUUID()}})).rejects.toMatchObject({code:'source_revision_conflict'});
  expect((await f.erp.pool.query('SELECT * FROM mock_erp.source_changes')).rowCount).toBe(1);
  await expect(f.erp.pool.query("UPDATE mock_erp.source_commands SET envelope=jsonb_set(envelope,'{payload,name}','\"changed\"')")).rejects.toThrow('immutable');
 }finally{await f.close();}
},60000);
test('A: commit before send and HTTP outage survive process restart with the exact command ID; lost acceptance response retries once',async()=>{
 const f=await sourceFixture();try{
  const input=f.submission('branch.provision',{externalId:'cairo',sourceRevision:1,name:'القاهرة',enabled:true,location:null},'branch','cairo');await crash(f,input);
  await runSourceOnce(f.erp.pool,{...f.c,tawselBaseUrl:'http://127.0.0.1:1'});
  expect((await sourceStatus(f.erp.pool)).commands[0]).toMatchObject({status:'pending',action_id:input.command.actionId,attempts:1});
  // Independent connection after the originating pool is no longer involved.
  const restarted=new Pool({connectionString:f.erp.url});try{
   await restarted.query("UPDATE mock_erp.source_commands SET next_attempt_at=clock_timestamp()");
   await crash(f);
   expect((await sourceStatus(restarted)).commands[0]!.status).toBe('pending');
   await restarted.query("UPDATE mock_erp.source_commands SET lease_until=clock_timestamp()-interval '1 second'");
   await Promise.all([runSourceOnce(restarted,f.c),runSourceOnce(f.erp.pool,f.c)]);
   expect((await sourceStatus(restarted)).commands[0]).toMatchObject({status:'accepted',action_id:input.command.actionId,attempts:3});
   expect((await f.db.pool.query('SELECT * FROM tawsel.branches WHERE tenant_id=$1',[f.c.tenantId])).rowCount).toBe(1);
   expect((await restarted.query('SELECT result FROM mock_erp.source_attempts ORDER BY number')).rows.map(r=>r.result)).toEqual(['connection_unavailable_acceptance_unknown','lease-expired','accepted']);
  }finally{await restarted.end();}
 }finally{await f.close();}
},60000);
test('A: source saves 51 proposed assignments but real Tawsel rejects the whole batch; no phantom accepted/held shipment',async()=>{
 const f=await sourceFixture();try{
  await f.setup();const items=[];
  for(let i=0;i<51;i++){const externalId=`shipment-${i}`;await f.submit(f.submission('intake.submitSnapshot',sourceSnapshot(externalId),'shipment',externalId));items.push({externalId,sourceDispatchCycleId:'cycle-1',expectedSourceRevision:1,expectedAssignmentRevision:0,assignmentRevision:1});}
  const payload={driverExternalId:'driver',receiptAsserted:true,items};
  const input={command:sourceEnvelope(f.c,'assignment.receiveBatch',payload),records:items.map(i=>({kind:'shipment',externalId:i.externalId,expectedRevision:1,desired:{...i,requestedState:'received'}}))};
  await saveSource(f.erp.pool,f.c,'staff',input);expect((await sourceStatus(f.erp.pool)).commands[0]!.status).toBe('pending');await runSourceOnce(f.erp.pool,f.c);
  const status=await sourceStatus(f.erp.pool);expect(status.commands[0]).toMatchObject({status:'rejected',last_error:'capacity_exceeded'});
  expect(status.records.filter(r=>r.kind==='shipment').every(r=>r.status==='rejected')).toBe(true);
  const server=receiverApp(f.erp.pool,f.c);try{
   expect((await server.inject('/api/v1/source/status')).statusCode).toBe(401);
   const headers={authorization:`Bearer ${f.c.statusToken}`};
   expect((await server.inject({url:'/api/v1/source/status?tenantId=forged',headers})).statusCode).toBe(400);
   const view=(await server.inject({url:'/api/v1/source/status',headers})).json();
   expect(conforms('source.schema.json#/$defs/Status',view)).toBe(true);
   expect(view.commands[0]).toMatchObject({status:'rejected',result:{receipt:{businessStatus:'rejected'}}});
   expect(JSON.stringify(view)).not.toContain('actor_subject');
   view.commands[0].status='accepted';expect(conforms('source.schema.json#/$defs/Status',view)).toBe(false);
  }finally{await server.close();}
  const client=intakeClient(f.url,f.source.token);for(const id of ['shipment-0','shipment-50'])expect((await client.get(id)).body).toMatchObject({state:'unassigned'});
  expect((await f.db.pool.query("SELECT 1 FROM tawsel.b2b_dispatch_cycles WHERE state='held'")).rowCount).toBe(0);
 }finally{await f.close();}
},120000);
