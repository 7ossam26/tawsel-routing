import {expect,test} from 'vitest';
import {spawn} from 'node:child_process';
import {createTestDatabase} from '../support/database.js';
import {senderFixture} from '../support/outbox-fixture.js';
import {controlledReceiver} from '../support/outbox-receiver.js';
import {OutboxService} from '../../src/outbox/service.js';
import {runOutboxOnce} from '../../src/outbox/worker.js';
import type {OutboxConfig} from '../../src/outbox/config.js';
import {outboxDemo} from '../../../../scripts/outbox-demo.js';
import {checkOutboxCapture} from '../../../../tests/erp-conformance/outbox.js';
import {receiverDemo} from '../../../../scripts/receiver-demo.js';
import {validateReceiverObservation} from '../../../../tests/erp-conformance/receiver.js';
import {publicValidator} from '@tawsel/api-client/validation';
import {randomBytes} from 'node:crypto';
import {createReceiverDatabase} from '../../../../scripts/mock-erp-database.js';
import {receiverProcess} from '../../../mock-erp/test/support/process.js';
import {applyInboxOnce} from '../../../mock-erp/src/projection.js';

test('P25 sender-side: process dies after real HTTP receipt before recording it; restart retains ID/bytes and refreshes signature',async()=>{
 const db=await createTestDatabase(),f=await senderFixture(db.pool),s=await f.source();
 const scope={tenantId:s.tenantId,integrationId:s.integrationId},key={...scope,keyId:'crash_key',secret:'a'.repeat(64)};
 const receiver=await controlledReceiver(scope,[key]);
 const config:OutboxConfig={encryptionKey:Buffer.alloc(32,2),destinations:[{...scope,url:receiver.url}],keys:[key],testLoopback:true};
 try{
  const service=new OutboxService(db.pool,config);
  await service.command(s.authorization,'integration.configureWebhook',s.command('integration.configureWebhook',{url:receiver.url,enabled:true,expectedRevision:0}));
  await service.command(s.authorization,'integration.rotateSigningKey',s.command('integration.rotateSigningKey',{keyId:key.keyId,overlapSeconds:300}));
  const child=spawn(process.execPath,['--import','tsx','apps/api/test/support/crash-outbox-worker.ts'],{cwd:process.cwd(),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,TAWSEL_CRASH_TEST_URL:db.url,TAWSEL_CRASH_CONFIG:JSON.stringify({...config,encryptionKey:config.encryptionKey.toString('hex')})}});
  await new Promise<void>((resolve,reject)=>{let errors='';child.stderr.on('data',v=>errors+=String(v));child.on('error',reject);child.on('exit',code=>code===92?resolve():reject(new Error(`Child ${code}: ${errors}`)));});
  expect(receiver.captures).toHaveLength(1);expect(receiver.captures[0]!.signatureValid).toBe(true);
  const eventId=receiver.captures[0]!.event.eventId;
  expect((await db.pool.query('SELECT status,received_at FROM tawsel.outbox_deliveries WHERE event_id=$1',[eventId])).rows[0]).toEqual({status:'sending',received_at:null});
  // Expire the dead process lease deterministically; A separately uses real time.
  await db.pool.query("UPDATE tawsel.outbox_deliveries SET lease_until=clock_timestamp()-interval '1 second' WHERE event_id=$1",[eventId]);
  await runOutboxOnce(db.pool,config);
  expect(receiver.captures).toHaveLength(2);expect(receiver.captures[1]!.event.eventId).toBe(eventId);expect(receiver.captures[1]!.body).toEqual(receiver.captures[0]!.body);
  expect(receiver.captures[1]!.headers['x-tawsel-delivery-timestamp']).not.toBe(receiver.captures[0]!.headers['x-tawsel-delivery-timestamp']);
  expect((await db.pool.query('SELECT status FROM tawsel.outbox_deliveries WHERE event_id=$1',[eventId])).rows[0].status).toBe('received');
  expect((await db.pool.query('SELECT result FROM tawsel.outbox_delivery_attempts WHERE event_id=$1 ORDER BY attempt_number',[eventId])).rows.map(r=>r.result)).toEqual(['lease-expired','received']);
  // Explicit scope: this harness has memory captures and no durable projection.
  expect(receiver.acknowledgementLevel).toBe('controlled-process-memory');
 }finally{await receiver.close();await f.close();await db.close();}
},20_000);

test('P25 public consumer: committed intake/outcome/correction/return events survive response loss; negative controls reject changed bytes and applied claims',async()=>{
 const {capture,result}=await outboxDemo();expect(result.uniqueEvents).toBeGreaterThan(10);expect(result.duplicateDeliveries).toBe(1);
 expect(result.eventTypes).toEqual(expect.arrayContaining(['task.snapshotAccepted','assignment.received','outcome.recorded','outcome.corrected','return.requested','return.subsetReceived']));
 const tampered=structuredClone(capture);tampered.deliveries[0]!.bodyBase64=Buffer.from('{}').toString('base64');expect(()=>checkOutboxCapture(tampered)).toThrow('signature');
 const applied=structuredClone(capture) as unknown as {queue:{projectionStatus:string}};applied.queue.projectionStatus='applied';expect(()=>checkOutboxCapture(applied as typeof capture)).toThrow('truthful');
 const missing=structuredClone(capture);missing.deliveries.splice(0,2);expect(()=>checkOutboxCapture(missing)).toThrow('gap');
},30_000);

test('P26 public consumer: separate sender/receiver processes, databases and roles survive both restarts and application response loss',async()=>{
 const demo=await receiverDemo();expect(demo.result).toMatchObject({uniqueEvents:19,deliveredPieces:2,reportedMinor:25000,receivedPieces:1,senderRestart:true,receiverRestart:true,firstAttempts:['lease-expired','received']});
 const validate=publicValidator();for(const snapshot of demo.snapshots)expect(validate('consumer.schema.json#/$defs/Snapshot',snapshot)).toBe(true);
 for(const report of demo.reports){expect(validate('consumer.schema.json#/$defs/ReportRead',report)).toBe(true);const p=report.report!.checkpoint;expect(p.appliedThrough).toBe(p.receivedThrough);}
 const snapshot=demo.snapshots[0]!,report=demo.reports[0]!.report!;
 const wrong={checkpoint:{...report.checkpoint,appliedThrough:0},state:snapshot.state};
 expect(()=>validateReceiverObservation(wrong,snapshot.throughSequence)).toThrow('checkpoint');
 expect(demo.history.filter(h=>h.event_type==='outcome.corrected')).toHaveLength(1);expect(demo.history.filter(h=>h.event_type==='return.subsetReceived')).toHaveLength(1);
},90000);

test('P26 abrupt sender exit after external durable inbox commit: receiver restart and sender lease recovery preserve one projection',async()=>{
 const db=await createTestDatabase(),f=await senderFixture(db.pool),s=await f.source(),consumer=await createReceiverDatabase();
 const c={tenantId:s.tenantId,integrationId:s.integrationId,statusToken:randomBytes(32).toString('hex'),keys:[{keyId:'crash',secret:randomBytes(32).toString('hex')}],host:'127.0.0.1',port:0};
 let receiver=await receiverProcess(consumer.url,c);
 const config:OutboxConfig={encryptionKey:randomBytes(32),keys:[{...c.keys[0]!,tenantId:c.tenantId,integrationId:c.integrationId}],destinations:[{tenantId:c.tenantId,integrationId:c.integrationId,url:`${receiver.url}/api/v1/consumer/events`}],testLoopback:true};
 try{
  const service=new OutboxService(db.pool,config);await service.command(s.authorization,'integration.configureWebhook',s.command('integration.configureWebhook',{url:config.destinations[0]!.url,enabled:true,expectedRevision:0}));await service.command(s.authorization,'integration.rotateSigningKey',s.command('integration.rotateSigningKey',{keyId:'crash',overlapSeconds:300}));
  const child=spawn(process.execPath,['--import','tsx','apps/api/test/support/crash-outbox-worker.ts'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,TAWSEL_CRASH_TEST_URL:db.url,TAWSEL_CRASH_CONFIG:JSON.stringify({...config,encryptionKey:config.encryptionKey.toString('hex')})}});
  await new Promise<void>((resolve,reject)=>{let errors='';child.stderr.on('data',x=>errors+=String(x));child.once('error',reject);child.once('exit',code=>code===92?resolve():reject(new Error(`Sender ${code}: ${errors}`)));});
  const inbox=(await consumer.pool.query('SELECT event_id,wire_body,applied_at FROM mock_erp.inbox')).rows;expect(inbox).toHaveLength(1);expect(inbox[0].applied_at).toBeNull();
  const port=Number(new URL(receiver.url).port);await receiver.close();receiver=await receiverProcess(consumer.url,{...c,port});
  await db.pool.query("UPDATE tawsel.outbox_deliveries SET lease_until=clock_timestamp()-interval '1 second' WHERE event_id=$1",[inbox[0].event_id]);await runOutboxOnce(db.pool,config);
  expect((await consumer.pool.query('SELECT wire_body FROM mock_erp.inbox')).rows[0].wire_body).toEqual(inbox[0].wire_body);
  await applyInboxOnce(consumer.pool);expect((await consumer.pool.query('SELECT * FROM mock_erp.transitions')).rows).toHaveLength(1);
  expect((await db.pool.query('SELECT result FROM tawsel.outbox_delivery_attempts ORDER BY attempt_number')).rows.map(r=>r.result)).toEqual(['lease-expired','received']);
 }finally{await receiver.close();await consumer.close();await f.close();await db.close();}
},30000);
