import {randomBytes,randomUUID} from 'node:crypto';
import {expect,test} from 'vitest';
import {Pool} from 'pg';
import {createReceiverDatabase} from '../../../../scripts/mock-erp-database.js';
import {createTestDatabase} from '../../../api/test/support/database.js';
import {senderFixture} from '../../../api/test/support/outbox-fixture.js';
import {envelope,type Intent} from '../../../api/src/outbox/envelope.js';
import {signWebhook} from '@tawsel/api-client/webhook-signature';
import {migrateReceiver,assertReceiverMigrationsCurrent} from '../../src/database.js';
import {receiverApp} from '../../src/app.js';
import {receiverProcess} from '../support/process.js';
import type {ReceiverConfig} from '../../src/config.js';
import {applyInboxOnce,consumerStatus} from '../../src/projection.js';
import {outboxDemo} from '../../../../scripts/outbox-demo.js';
import {publicValidator} from '@tawsel/api-client/validation';
import type {components} from '@tawsel/api-client';
async function fixture(){
 const sender=await createTestDatabase(),f=await senderFixture(sender.pool),s=await f.source();await s.change();
 const db=await createReceiverDatabase(),c:ReceiverConfig={tenantId:s.tenantId,integrationId:s.integrationId,statusToken:randomBytes(32).toString('hex'),keys:[{keyId:'test',secret:randomBytes(32).toString('hex')}],host:'127.0.0.1',port:0};
 const row=(await sender.pool.query<Intent>('SELECT * FROM tawsel.outbox_intents WHERE recipient_id=$1 ORDER BY recipient_sequence LIMIT 1',[s.integrationId])).rows[0]!;
 const event=envelope(row);await migrateReceiver(db.pool,c);
 return {sender,f,s,db,c,event,async close(){await f.close();await sender.close();await db.close();}};
}
test('managed release readiness never migrates implicitly, checks history and scope',async()=>{
 const db=await createReceiverDatabase(),scope={tenantId:randomUUID(),integrationId:randomUUID()};
 try{
  await expect(assertReceiverMigrationsCurrent(db.pool,scope)).rejects.toThrow();
  expect((await db.pool.query("SELECT to_regnamespace('mock_erp') AS schema")).rows[0].schema).toBeNull();
  await migrateReceiver(db.pool,scope);
  await expect(assertReceiverMigrationsCurrent(db.pool,scope)).resolves.toBeUndefined();
  await expect(assertReceiverMigrationsCurrent(db.pool,{...scope,tenantId:randomUUID()})).rejects.toThrow('another recipient');
  await db.pool.query("UPDATE mock_erp.migrations SET hash='changed' WHERE name=(SELECT min(name) FROM mock_erp.migrations)");
  await expect(assertReceiverMigrationsCurrent(db.pool,scope)).rejects.toThrow('changed');
 }finally{await db.close();}
});
function deliver(url:string,c:ReceiverConfig,event:unknown,bytes=Buffer.from(JSON.stringify(event))){return fetch(`${url}/api/v1/consumer/events`,{method:'POST',headers:{'content-type':'application/json',...signWebhook(bytes,c,c.keys[0]!,String(Date.now()))},body:bytes,signal:AbortSignal.timeout(5000)});}
test('A: real HTTP durable receipt, concurrent duplicates, exact-byte mismatch and recipient/schema/identity validation',async()=>{
 const f=await fixture(),app=receiverApp(f.db.pool,f.c),url=await app.listen({host:'127.0.0.1',port:0});
 try{
  const responses=await Promise.all(Array.from({length:4},()=>deliver(url,f.c,f.event)));expect(responses.map(r=>r.status)).toEqual([200,200,200,200]);
  expect(await responses[0]!.json()).toMatchObject({acknowledgement:'received',eventId:f.event.eventId});
  const stored=(await f.db.pool.query('SELECT * FROM mock_erp.inbox')).rows;expect(stored).toHaveLength(1);expect(stored[0].applied_at).toBeNull();
  expect((await deliver(url,f.c,f.event,Buffer.from(JSON.stringify(f.event,null,2)))).status).toBe(409);
  expect((await f.db.pool.query('SELECT * FROM mock_erp.mismatches')).rows).toHaveLength(1);
  expect((await deliver(url,f.c,{...f.event,eventId:randomUUID(),recipientIntegrationId:randomUUID()})).status).toBe(403);
  expect((await deliver(url,f.c,{...f.event,eventId:randomUUID(),tenantId:randomUUID()})).status).toBe(403);
  const nested=structuredClone(f.event);nested.eventId=randomUUID();(nested.payload.service as {integrationId:string}).integrationId=randomUUID();
  expect((await deliver(url,f.c,nested)).status).toBe(403);
  expect((await deliver(url,f.c,{...f.event,eventId:randomUUID()})).status).toBe(409);
  expect((await deliver(url,f.c,{...f.event,eventId:randomUUID(),schemaVersion:'99.0.0'})).status).toBe(422);
  expect((await deliver(url,f.c,{...f.event,eventId:randomUUID(),aggregate:{...f.event.aggregate,id:randomUUID()}})).status).toBe(403);
  const bad=Buffer.from(JSON.stringify(f.event));const headers=signWebhook(bad,f.c,f.c.keys[0]!,String(Date.now()-300001));
  expect((await fetch(`${url}/api/v1/consumer/events`,{method:'POST',headers:{'content-type':'application/json',...headers},body:bad})).status).toBe(401);
  expect((await f.db.pool.query('SELECT * FROM mock_erp.inbox')).rows).toHaveLength(1);
  const foreign=new URL(f.sender.url),receiver=new URL(f.db.url);foreign.username=receiver.username;foreign.password=receiver.password;
  const denied=new Pool({connectionString:foreign.href});try{await expect(denied.query('SELECT * FROM tawsel.outbox_intents')).rejects.toMatchObject({code:'42501'});}finally{await denied.end();}
 }finally{await app.close();await f.close();}
},30000);
test('B: local projection and processed marker roll back together, then independent workers apply exactly once',async()=>{
 const f=await fixture(),app=receiverApp(f.db.pool,f.c),url=await app.listen({host:'127.0.0.1',port:0});
 try{
  expect((await deliver(url,f.c,f.event)).status).toBe(200);
  const aggregate={type:f.event.aggregate.type,id:f.event.aggregate.id};
  expect((await consumerStatus(f.db.pool,f.c,aggregate)).checkpoint).toMatchObject({receivedThrough:1,appliedThrough:0});
  expect(await applyInboxOnce(f.db.pool,{async afterProjectionWrite(){throw new Error('injected write failure');}})).toBe(false);
  expect((await f.db.pool.query('SELECT state,cursor_sequence FROM mock_erp.streams')).rows[0]).toEqual({state:null,cursor_sequence:'0'});
  expect((await f.db.pool.query('SELECT * FROM mock_erp.transitions')).rows).toHaveLength(0);
  expect((await consumerStatus(f.db.pool,f.c,aggregate)).checkpoint).toMatchObject({appliedThrough:0,lastError:'projection_failed'});
  expect((await Promise.all([applyInboxOnce(f.db.pool),applyInboxOnce(f.db.pool)])).filter(Boolean)).toHaveLength(1);
  expect((await deliver(url,f.c,f.event)).status).toBe(200);
  const response=await fetch(`${url}/api/v1/consumer/status?aggregateType=${aggregate.type}&aggregateId=${aggregate.id}`,{headers:{authorization:`Bearer ${f.c.statusToken}`}});
  const status=await response.json() as components['schemas']['ConsumerStatus'];
  expect(publicValidator()('consumer.schema.json#/$defs/Status',status)).toBe(true);expect(status.checkpoint).toMatchObject({receivedThrough:1,appliedThrough:1,pendingCount:0,lastError:null});
  expect((await fetch(`${url}/api/v1/consumer/status?aggregateType=${aggregate.type}&aggregateId=${aggregate.id}`)).status).toBe(401);
 }finally{await app.close();await f.close();}
},30000);
test.each(['before-projection-commit','after-projection-commit'])('B: abrupt %s retains atomic state through restart',async fault=>{
 const f=await fixture(),app=receiverApp(f.db.pool,f.c),url=await app.listen({host:'127.0.0.1',port:0});
 try{
  expect((await deliver(url,f.c,f.event)).status).toBe(200);
  const child=await receiverProcess(f.db.url,f.c,fault);try{expect((await child.exited)[0]).toBe(93);}finally{await child.close();}
  expect((await f.db.pool.query('SELECT * FROM mock_erp.transitions')).rows).toHaveLength(fault==='before-projection-commit'?0:1);
  const before=(await f.db.pool.query('SELECT applied_at FROM mock_erp.inbox')).rows[0].applied_at;
  if(fault==='before-projection-commit')expect(before).toBeNull();else expect(before).not.toBeNull();
  await applyInboxOnce(f.db.pool);expect((await f.db.pool.query('SELECT * FROM mock_erp.transitions')).rows).toHaveLength(1);
 }finally{await app.close();await f.close();}
},30000);
test('B: actual intake, execution, corrected collection and actual subset receipt project without duplicate quantities',async()=>{
 const {capture}=await outboxDemo(),db=await createReceiverDatabase();
 const c:ReceiverConfig={...capture.scope,statusToken:randomBytes(32).toString('hex'),keys:capture.fixtureKeys,host:'127.0.0.1',port:0};await migrateReceiver(db.pool,c);
 const app=receiverApp(db.pool,c),url=await app.listen({host:'127.0.0.1',port:0});
 try{
  const events=capture.deliveries.map(d=>JSON.parse(Buffer.from(d.bodyBase64,'base64').toString()) as components['schemas']['EventEnvelope']);
  // Receiver gets a cross-stream dependency before the task outcome stream.
  const requested=events.find(e=>e.eventType==='return.requested')!;expect((await deliver(url,c,requested)).status).toBe(200);
  expect(await applyInboxOnce(db.pool)).toBe(false);
  expect((await consumerStatus(db.pool,c,requested.aggregate)).checkpoint.lastError).toBe('dependency_missing');
  for(const e of events.toReversed())expect((await deliver(url,c,e)).status).toBe(200);
  let failedCorrection=false;
  for(let i=0;i<100&&await applyInboxOnce(db.pool,{async afterProjectionWrite(e){if(e.eventType==='outcome.corrected'){failedCorrection=true;throw new Error('quantity write failure');}}});i++){/* drain up to injected quantity rollback */}
  expect(failedCorrection).toBe(true);
  const correctionEvent=events.find(e=>e.eventType==='outcome.corrected')!;
  const beforeRetry=(await consumerStatus(db.pool,c,correctionEvent.aggregate)).state!;
  expect(beforeRetry.outcomes[0]!.lines[0]!.delivered).toBe(0);expect(beforeRetry.outcomes[0]!.collection.reported).toBeNull();
  expect((await db.pool.query('SELECT applied_at FROM mock_erp.inbox WHERE event_id=$1',[correctionEvent.eventId])).rows[0].applied_at).toBeNull();
  for(let i=0;i<100&&await applyInboxOnce(db.pool);i++){/* retry and finish once */}
  const types=(await db.pool.query('SELECT event_type FROM mock_erp.transitions')).rows.map(r=>r.event_type);
  expect(types).toEqual(expect.arrayContaining(['task.snapshotAccepted','assignment.received','outcome.recorded','outcome.corrected','return.requested','return.subsetReceived']));
  expect(types).toHaveLength(new Set(events.map(e=>e.eventId)).size);
  const outcome=events.find(e=>e.eventType==='outcome.corrected')!,state=(await consumerStatus(db.pool,c,outcome.aggregate)).state!;
  expect(state.outcomes).toHaveLength(1);expect(state.outcomes[0]!.lines[0]!.delivered).toBe(2);expect(state.outcomes[0]!.collection.reported!.amountMinor).toBe(25000);
  expect((await consumerStatus(db.pool,c,requested.aggregate)).state!.returnItems[0]).toMatchObject({received:1,unresolved:0});
  expect((await db.pool.query('SELECT * FROM mock_erp.inbox WHERE applied_at IS NULL')).rows).toHaveLength(0);
 }finally{await app.close();await db.close();}
},60000);
test.each(['before-inbox','after-inbox'])('A: abrupt process exit %s never acknowledges uncommitted receipt',async fault=>{
 const f=await fixture(),child=await receiverProcess(f.db.url,f.c,fault);
 try{
  await expect(deliver(child.url,f.c,f.event)).rejects.toThrow();expect((await child.exited)[0]).toBe(93);
  expect((await f.db.pool.query('SELECT * FROM mock_erp.inbox')).rows).toHaveLength(fault==='before-inbox'?0:1);
  const restart=await receiverProcess(f.db.url,f.c);try{expect((await deliver(restart.url,f.c,f.event)).status).toBe(200);expect((await f.db.pool.query('SELECT * FROM mock_erp.inbox')).rows).toHaveLength(1);}finally{await restart.close();}
 }finally{await child.close();await f.close();}
},30000);
