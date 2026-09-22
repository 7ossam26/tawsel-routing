import {randomUUID} from 'node:crypto';
import {beforeEach,afterEach,test,expect} from 'vitest';
import {createTestDatabase} from '../support/database.js';
import {prepareAccessFixture,principals,ids} from '../support/access-fixture.js';
import {IndependentIntakeService} from '../../src/b2c-intake/service.js';
import {Locations,locationConforms} from '../../src/locations/service.js';
import {Nominatim} from '../../src/locations/geocoder.js';
import {executeCommandInTransaction,type ActionEnvelope} from '../../src/commands/kernel.js';
import {withTransaction} from '../../src/db/transaction.js';
import {createServer} from 'node:http';
import {assertConfirmedLocation} from '../../../../tests/erp-conformance/locations.js';
let db:Awaited<ReturnType<typeof createTestDatabase>>,service:Locations,id:string;
function command(payload:Record<string,unknown>,operationId='location.confirmPin'):ActionEnvelope{return {schemaVersion:'1.0.0',payloadVersion:'1.0.0',actionId:randomUUID(),operationId,context:{kind:'device',tenantId:ids.personalTenant,accountId:ids.personalAccount,deviceId:randomUUID(),deviceGeneration:1,deviceSequence:1},resources:operationId==='location.confirmPin'?{taskId:id}:{},baseVersions:{},dependsOnActionIds:[],observation:{observedAt:null,clock:{quality:'unknown'}},payload};}
const payload=(revision=0)=>({taskId:id,expectedSourceRevision:1,expectedLocationRevision:revision,confirmed:true,selection:{kind:'manual',coordinates:{latitude:30.0444,longitude:31.2357}}});
beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);const r=await new IndependentIntakeService(db.pool).create(principals.personal,command({recipientName:'منى',recipientPhone:'01012345678',destination:{kind:'address',addressText:'التحرير القاهرة'}},'task.createIndependent'));id=(r.response!.body as {task:{taskId:string}}).task.taskId;service=new Locations(db.pool);});
afterEach(async()=>{await db?.close();});
test('explicit pin preserves original, commits history/replan once and rejects stale corrections',async()=>{
 const c=command(payload());const r=await service.confirm(principals.personal,c);expect(r.receipt.businessStatus).toBe('accepted');await service.confirm(principals.personal,c);
 const one=await service.get(principals.personal,id);expect(one.original).toEqual({kind:'address',addressText:'التحرير القاهرة'});expect(one.locationRevision).toBe(1);expect(one.planningInputRevision).toBe(1);expect(one.pin?.provenance.kind).toBe('manual');
 await expect(service.confirm(principals.personal,command(payload()))).rejects.toMatchObject({code:'stale_revision'});
 await service.confirm(principals.personal,command({...payload(1),selection:{kind:'manual',coordinates:{latitude:30.05,longitude:31.24}}}));
 const two=await service.get(principals.personal,id);expect(two.locationRevision).toBe(2);expect(two.planningInputRevision).toBe(2);expect(two.planningStatus).toBe('pending');expect(assertConfirmedLocation(two).coordinates).toEqual({latitude:30.05,longitude:31.24});
 expect((await db.pool.query('SELECT count(*)::int AS n FROM tawsel.location_history')).rows[0].n).toBe(2);
 expect((await db.pool.query('SELECT address_text FROM tawsel.task_source_addresses WHERE task_id=$1',[id])).rows[0].address_text).toBe('التحرير القاهرة');
});
test('invalid/out of range/unconfirmed/forged fields never publish planning input',async()=>{
 for(const p of [{...payload(),confirmed:false},{...payload(),selection:{kind:'manual',coordinates:{latitude:91,longitude:30}}},{...payload(),selection:{kind:'manual',coordinates:{latitude:30,longitude:-181}}},{...payload(),accuracy:99}])await expect(service.confirm(principals.personal,command(p))).rejects.toMatchObject({statusCode:400});
 expect((await db.pool.query('SELECT count(*)::int AS n FROM tawsel.task_locations')).rows[0].n).toBe(0);
 expect((await service.get(principals.personal,id)).locationReadiness).toBe('needs-resolution');
});
test('guessed cross tenant IDs cannot read search or confirm, including self-consistent attacker context',async()=>{
 await db.pool.query("INSERT INTO tawsel.role_capabilities VALUES ($1,$2,'location.review',true)",[ids.otherTenant,ids.otherRole]);
 await expect(service.get(principals.other,id)).rejects.toMatchObject({statusCode:404});
 await expect(service.search(principals.other,id,{query:'القاهرة'})).rejects.toMatchObject({statusCode:404});
 const c=command(payload());c.context={...c.context,kind:'device',tenantId:ids.otherTenant,accountId:ids.otherAccount,deviceId:randomUUID(),deviceGeneration:1,deviceSequence:1};
 await expect(service.confirm(principals.other,c)).rejects.toMatchObject({statusCode:404});
 expect((await service.get(principals.personal,id)).pin).toBeNull();
});
test('candidate selection is explicit, scoped, bounded and preserves pin on empty/error responses',async()=>{
 let mode='ok',calls=0;
 const geocoder=new Nominatim({cacheEntries:2,fetcher:async(url)=>{calls++;const u=new URL(String(url));expect(u.searchParams.get('bounded')).toBe('1');expect(u.searchParams.get('limit')).toBe('5');if(mode==='error')return new Response('',{status:503});return Response.json(mode==='empty'?[]:[{lat:'30.04',lon:'31.23',display_name:'ميدان التحرير، القاهرة',addresstype:'square'}]);}});
 service=new Locations(db.pool,geocoder);const result=await service.search(principals.personal,id,{query:'التحرير'});await service.search(principals.personal,id,{query:'التحرير'});expect(calls).toBe(1);expect((await service.get(principals.personal,id)).pin).toBeNull();
 expect(result.items[0]).not.toHaveProperty('accuracy');await expect(service.confirm(principals.personal,command({...payload(),selection:{kind:'candidate',candidateId:'forged'}}))).rejects.toMatchObject({code:'stale_revision'});
 await service.confirm(principals.personal,command({...payload(),selection:{kind:'candidate',candidateId:result.items[0]!.id}}));
 mode='empty';expect((await service.search(principals.personal,id,{query:'غير موجود'})).items).toEqual([]);
 mode='error';await expect(service.search(principals.personal,id,{query:'فشل الخدمة'})).rejects.toMatchObject({statusCode:503});expect((await service.get(principals.personal,id)).pin?.provenance.kind).toBe('nominatim');
});
test('independent concurrent confirmations accept exactly one revision with durable commit',async()=>{
 const results=await Promise.allSettled([service.confirm(principals.personal,command(payload())),service.confirm(principals.personal,command(payload()))]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
 const client=await db.pool.connect();try{expect((await client.query('SELECT revision FROM tawsel.task_locations WHERE task_id=$1',[id])).rows[0].revision).toBe('1');}finally{client.release();}
});
test('source revision invalidates old pin; assigned owner can correct after departure',async()=>{
 await service.confirm(principals.personal,command(payload()));await db.pool.query('UPDATE tawsel.b2c_tasks SET revision=2,departure_at=clock_timestamp() WHERE task_id=$1',[id]);
 expect((await service.get(principals.personal,id)).pin).toBeNull();await expect(service.confirm(principals.personal,command(payload(1)))).rejects.toMatchObject({code:'stale_revision'});
 await service.confirm(principals.personal,command({...payload(1),expectedSourceRevision:2}));expect((await service.get(principals.personal,id)).pin).not.toBeNull();
});
test('B2B branch staff before departure, assigned driver afterward; source stays immutable and full capacity rolls back',async()=>{
 await db.pool.query("INSERT INTO tawsel.role_capabilities VALUES ($1,$2,'location.review',true)",[ids.tenant,ids.role]);
 await db.pool.query('INSERT INTO tawsel.provisioning_sources VALUES ($1,$2,$3)',[ids.tenant,ids.integration,principals.staff.issuer]);
 id=randomUUID();const cycle=randomUUID(),action=randomUUID();
 // Source/receipt fixture uses real FK/commit boundaries; it is not public ERP evidence.
 const sourceCommand=command({},'intake.submitSnapshot');sourceCommand.actionId=action;sourceCommand.context={kind:'integration',tenantId:ids.tenant,integrationId:ids.integration};
 await withTransaction(db.pool,tx=>executeCommandInTransaction(tx,{tenantId:ids.tenant,sourceId:ids.integration},sourceCommand,{async authorize(){},async writeDomain(tx){
  await tx.query('INSERT INTO tawsel.b2b_tasks VALUES ($1,$2,$3,$4,$5,1)',[ids.tenant,ids.integration,id,'location-fixture',ids.branch]);
  await tx.query('INSERT INTO tawsel.b2b_source_snapshots (tenant_id,task_id,source_revision,payload,payload_hash,source_id,action_id) VALUES ($1,$2,1,$3,$4,$5,$6)',[ids.tenant,id,{recipientName:'عميل الشركة',destination:{kind:'address',addressText:'عنوان تجاري أصلي'}},'b'.repeat(64),ids.integration,action]);
  await tx.query(`INSERT INTO tawsel.b2b_dispatch_cycles (tenant_id,integration_id,task_id,dispatch_cycle_id,source_dispatch_cycle_id,state,driver_id,driver_external_id,received_at) VALUES ($1,$2,$3,$4,'cycle','held',$5,'driver',clock_timestamp())`,[ids.tenant,ids.integration,id,cycle,ids.driver]);
  return {status:'accepted',response:{status:200,body:{}},summary:{},audit:{},resourceVersions:{},intents:[]};
 },async writeProgress(){}}));
 const cmd=(account:string,rev=0)=>{const c=command(payload(rev));c.context={kind:'device',tenantId:ids.tenant,accountId:account,deviceId:randomUUID(),deviceGeneration:1,deviceSequence:1};return c;};
 await service.confirm(principals.staff,cmd(ids.staff));expect((await service.get(principals.staff,id)).original.addressText).toBe('عنوان تجاري أصلي');
 await db.pool.query('UPDATE tawsel.b2b_tasks SET branch_id=$2 WHERE task_id=$1',[id,ids.forbiddenBranch]);
 await expect(service.get(principals.staff,id)).rejects.toMatchObject({statusCode:404});
 await db.pool.query('UPDATE tawsel.b2b_tasks SET branch_id=$2 WHERE task_id=$1',[id,ids.branch]);
 expect((await db.pool.query("SELECT count(*)::int n FROM tawsel.driver_planned_stops WHERE state='remaining'")).rows[0].n).toBe(1);
 await db.pool.query('UPDATE tawsel.b2b_dispatch_cycles SET departure_at=clock_timestamp() WHERE task_id=$1',[id]);
 await expect(service.confirm(principals.staff,cmd(ids.staff,1))).rejects.toMatchObject({code:'lifecycle_forbidden'});
 await service.confirm(principals.driver,cmd(ids.driverAccount,1));
 await expect(service.confirm({...principals.driver,subject:'driver-2'},cmd(ids.secondDriverAccount,2))).rejects.toMatchObject({statusCode:404});
 // A stale source must not silently restore the commercial pin as the execution pin.
 expect((await service.get(principals.driver,id)).pin?.confirmedBy).toBe(ids.driverAccount);
 expect((await db.pool.query('SELECT payload FROM tawsel.b2b_source_snapshots WHERE task_id=$1',[id])).rows[0].payload.destination.addressText).toBe('عنوان تجاري أصلي');
 // Fill 50 branch reservations, release this customer, then confirm: all tentative writes must roll back.
 await db.pool.query("UPDATE tawsel.driver_planned_stops SET state='released' WHERE dispatch_cycle_id=$1",[cycle]);
 for(let n=0;n<50;n++)await db.pool.query("INSERT INTO tawsel.driver_planned_stops (tenant_id,driver_id,stop_id,kind,branch_id,state) VALUES ($1,$2,$3,'branch',$4,'remaining')",[ids.tenant,ids.driver,randomUUID(),ids.branch]);
 await expect(service.confirm(principals.driver,cmd(ids.driverAccount,2))).rejects.toMatchObject({code:'capacity_exceeded'});
 expect((await service.get(principals.driver,id)).locationRevision).toBe(2);
 expect((await db.pool.query("SELECT state FROM tawsel.driver_planned_stops WHERE dispatch_cycle_id=$1",[cycle])).rows[0].state).toBe('released');
 const events=await db.pool.query("SELECT recipient_id,payload FROM tawsel.outbox_intents WHERE event_type='location.pinConfirmed' ORDER BY payload->'location'->>'locationRevision'");
 expect(events.rows).toHaveLength(2);expect(events.rows.map(e=>e.recipient_id)).toEqual([ids.integration,ids.integration]);expect(events.rows[1].payload.location.locationRevision).toBe(2);
 for(const event of events.rows)expect(locationConforms('ConfirmedEvent',event.payload)).toBe(true);
});
test('database failure after pin and planning writes rolls back the entire confirmation',async()=>{
 await db.pool.query("CREATE FUNCTION public.fail_location() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test history failure'; END $$");
 await db.pool.query('CREATE TRIGGER fail_location AFTER INSERT ON tawsel.location_history FOR EACH ROW EXECUTE FUNCTION public.fail_location()');
 await expect(service.confirm(principals.personal,command(payload()))).rejects.toThrow('test history failure');
 for(const table of ['task_locations','location_history','location_planning_inputs','intake_replan_intents'])expect((await db.pool.query(`SELECT count(*)::int n FROM tawsel.${table}`)).rows[0].n).toBe(0);
 expect((await service.get(principals.personal,id)).original.addressText).toBe('التحرير القاهرة');
});
test('real controlled HTTP provider timeout, malformed coordinates and cache eviction retain confirmed location',async()=>{
 let mode='ok';const server=createServer((_req,res)=>{if(mode==='timeout')return;res.setHeader('Content-Type','application/json');res.end(JSON.stringify([{lat:mode==='invalid'?'NaN':'30.04',lon:'31.23',display_name:'القاهرة'}]));});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address() as {port:number};
 try{
  service=new Locations(db.pool,new Nominatim({baseUrl:`http://127.0.0.1:${address.port}`,timeoutMs:100,cacheEntries:1}));
  const first=await service.search(principals.personal,id,{query:'الأول'});await service.search(principals.personal,id,{query:'الثاني'});
  await expect(service.confirm(principals.personal,command({...payload(),selection:{kind:'candidate',candidateId:first.items[0]!.id}}))).rejects.toMatchObject({code:'stale_revision'});
  await service.confirm(principals.personal,command(payload()));mode='timeout';await expect(service.search(principals.personal,id,{query:'بطيء'})).rejects.toMatchObject({statusCode:503});
  mode='invalid';await expect(service.search(principals.personal,id,{query:'إحداثيات تالفة'})).rejects.toMatchObject({statusCode:503});
  expect((await service.get(principals.personal,id)).locationRevision).toBe(1);
 }finally{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
