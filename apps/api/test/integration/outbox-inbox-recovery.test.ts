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
