import {afterEach,beforeEach,expect,test} from 'vitest';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {randomUUID} from 'node:crypto';
import {createTestDatabase} from '../support/database.js';
import {senderFixture} from '../support/outbox-fixture.js';
import {claimDelivery,completeDelivery} from '../../src/outbox/queue.js';
import {OutboxService} from '../../src/outbox/service.js';
import type {OutboxConfig} from '../../src/outbox/config.js';
import {runOutboxOnce,runOutboxBatch,type DeliveryLog} from '../../src/outbox/worker.js';
import {controlledReceiver} from '../support/outbox-receiver.js';
import {verifyWebhook} from '../../../../packages/api-client/src/webhook-signature.js';
import {resolveDestination,isPublicAddress} from '../../src/outbox/destination.js';
import Fastify from 'fastify';
import {outboxRoutes} from '../../src/outbox/routes.js';
import {OutboxClient} from '../../../../packages/api-client/src/outbox.js';
import {outboxConforms} from '../../src/outbox/validation.js';
import {OutboxReads} from '../../src/outbox/reads.js';
import {retryDelay} from '../../src/outbox/queue.js';
import {mkdtemp,readdir,copyFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {migrate} from '../../src/db/migrate.js';
import {provisioningRoutes} from '../../src/provisioning/routes.js';
import {writeProjection} from '../../src/provisioning/domain.js';
import {bindSource,operatorToken} from '../support/provisioning-fixture.js';

let db:Awaited<ReturnType<typeof createTestDatabase>>,f:Awaited<ReturnType<typeof senderFixture>>;
const closers:(()=>Promise<unknown>)[]=[];
beforeEach(async()=>{db=await createTestDatabase();f=await senderFixture(db.pool);});
afterEach(async()=>{for(const close of closers.splice(0).reverse())await close();await f?.close();await db?.close();});
async function ready(){const s=await f.source();await db.pool.query('INSERT INTO tawsel.outbox_endpoints(tenant_id,integration_id,url) VALUES($1,$2,$3)',[s.tenantId,s.integrationId,'https://receiver.fixture.invalid/events']);return s;}

test('A: committed source intent is discoverable, attempts and exact bytes survive an abrupt claimant process exit',async()=>{
 const s=await ready();
 const before=(await db.pool.query('SELECT event_id FROM tawsel.outbox_intents WHERE tenant_id=$1',[s.tenantId])).rows[0].event_id;
 const child=spawn(process.execPath,['--import','tsx','apps/api/test/support/crash-outbox-worker.ts'],{cwd:process.cwd(),env:{...process.env,TAWSEL_CRASH_TEST_URL:db.url},stdio:['ignore','pipe','pipe'],windowsHide:true});
 const result=await new Promise<{code:number|null;text:string}>((resolve,reject)=>{let text='',errors='';child.stdout.on('data',v=>text+=String(v));child.stderr.on('data',v=>errors+=String(v));child.on('error',reject);child.on('exit',code=>code===91?resolve({code,text}):reject(new Error(errors)));});
 expect(JSON.parse(result.text).eventId).toBe(before);
 const stored=(await db.pool.query('SELECT * FROM tawsel.outbox_deliveries WHERE event_id=$1',[before])).rows[0];
 expect(stored.status).toBe('sending');await delay(230);
 const recovered=await claimDelivery(db.pool);expect(recovered?.eventId).toBe(before);expect(recovered?.attempt).toBe(2);expect(recovered?.body).toEqual(stored.body);
 expect(Number(recovered?.timestamp)).toBeGreaterThan(Number(stored.last_timestamp));
 expect((await db.pool.query('SELECT result FROM tawsel.outbox_delivery_attempts ORDER BY attempt_number')).rows.map(r=>r.result)).toEqual(['lease-expired','sending']);
 expect(await completeDelivery(db.pool,recovered!,{received:true})).toBe(true);
 expect((await db.pool.query('SELECT state FROM tawsel.outbox_intents WHERE event_id=$1',[before])).rows[0].state).toBe('pending');
});

async function setupWire(){
 const source=await f.source(),scope={tenantId:source.tenantId,integrationId:source.integrationId};
 const keys=[{keyId:'key_1',secret:'1'.repeat(64)},{keyId:'key_2',secret:'2'.repeat(64)}];
 const receiver=await controlledReceiver(scope,keys);closers.push(()=>receiver.close());
 const config:OutboxConfig={encryptionKey:Buffer.alloc(32,3),testLoopback:true,destinations:[{...scope,url:receiver.url}],keys:keys.map(k=>({...scope,...k}))};
 const service=new OutboxService(db.pool,config);
 const configuration=source.command('integration.configureWebhook',{url:receiver.url,enabled:true,expectedRevision:0});
 await service.command(source.authorization,'integration.configureWebhook',configuration);
 const rotation=source.command('integration.rotateSigningKey',{keyId:'key_1',overlapSeconds:300});
 await service.command(source.authorization,rotation.operationId,rotation);
 return {source,scope,keys,receiver,config,service,rotation,configuration};
}
test('B: real HTTP signs exact UTF-8 bytes, independent receiver validates, receipt never marks projection applied',async()=>{
 const w=await setupWire(),logs:DeliveryLog[]=[];
 w.receiver.controls.beforeAck=async()=>{
  const c=await db.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='100ms'");await c.query('SELECT 1 FROM tawsel.outbox_deliveries FOR UPDATE');await c.query('ROLLBACK');}finally{c.release();}
 };
 await runOutboxOnce(db.pool,w.config,{log:l=>logs.push(l)});
 expect(w.receiver.captures).toHaveLength(1);const capture=w.receiver.captures[0]!;expect(capture.signatureValid).toBe(true);
 expect(verifyWebhook(Buffer.concat([capture.body,Buffer.from(' ')]),capture.headers,w.scope,w.keys)).toBe(false);
 expect(verifyWebhook(capture.body,capture.headers,w.scope,[{keyId:'key_1',secret:'4'.repeat(64)}])).toBe(false);
 expect(verifyWebhook(capture.body,capture.headers,{...w.scope,integrationId:randomUUID()},w.keys)).toBe(false);
 expect(verifyWebhook(capture.body,capture.headers,w.scope,w.keys,Date.now()+301_000)).toBe(false);
 const row=(await db.pool.query('SELECT * FROM tawsel.outbox_deliveries WHERE event_id=$1',[capture.event.eventId])).rows[0];
 expect(row.status).toBe('received');expect(row.body).toEqual(capture.body);
 expect((await db.pool.query('SELECT state FROM tawsel.outbox_intents WHERE event_id=$1',[capture.event.eventId])).rows[0].state).toBe('pending');
 expect(logs[0]?.result).toBe('received');expect(JSON.stringify(logs)).not.toContain(w.receiver.url);expect(JSON.stringify(logs)).not.toContain('secret');
 await w.source.change();await runOutboxOnce(db.pool,w.config);
 expect(w.receiver.captures[1]?.signatureValid).toBe(true);
});
test('B: lost HTTP acknowledgement redelivers identical bytes and ID with fresh timestamp and newly rotated key',async()=>{
 const w=await setupWire();w.receiver.controls.mode='lose-response';
 await runOutboxOnce(db.pool,w.config);
 expect((await db.pool.query('SELECT status FROM tawsel.outbox_deliveries WHERE tenant_id=$1',[w.source.tenantId])).rows[0].status).toBe('failed');
 const old=w.receiver.captures[0]!;
 const rotation=w.source.command('integration.rotateSigningKey',{keyId:'key_2',overlapSeconds:300});
 const result=await w.service.command(w.source.authorization,rotation.operationId,rotation);
 expect(await w.service.command(w.source.authorization,rotation.operationId,rotation)).toEqual(result);
 const state=result.response!.body as {verifyUntil:string};
 const overlap=[{...w.keys[0]!,verifyUntil:Date.parse(state.verifyUntil)},w.keys[1]!];
 expect(verifyWebhook(old.body,old.headers,w.scope,overlap)).toBe(true);
 expect(verifyWebhook(old.body,old.headers,w.scope,[{...w.keys[0]!,verifyUntil:Date.now()-1}])).toBe(false);
 const eventId=old.event.eventId;
 await w.service.command(w.source.authorization,'integration.retryDelivery',w.source.command('integration.retryDelivery',{eventId}));
 w.receiver.controls.mode='received';await runOutboxOnce(db.pool,w.config);
 const next=w.receiver.captures[1]!;expect(next.body).toEqual(old.body);expect(next.headers['x-tawsel-key-id']).toBe('key_2');expect(next.signatureValid).toBe(true);
 expect(Number(next.headers['x-tawsel-delivery-timestamp'])).toBeGreaterThan(Number(old.headers['x-tawsel-delivery-timestamp']));
 const saved=(await db.pool.query('SELECT encrypted_secret FROM tawsel.outbox_signing_keys')).rows;expect(JSON.stringify(saved)).not.toContain(w.keys[0]!.secret);
 const commands=(await db.pool.query('SELECT response_body,result_summary FROM tawsel.command_identities WHERE tenant_id=$1',[w.source.tenantId])).rows;expect(JSON.stringify(commands)).not.toContain(w.keys[1]!.secret);
});
test.each(['timeout','redirect','invalid-ack','unavailable'] as const)('B: %s is a retained safe failure with bounded retry',async mode=>{
 const w=await setupWire();w.receiver.controls.mode=mode;
 const began=Date.now();await runOutboxOnce(db.pool,w.config,{timeoutMs:200});expect(Date.now()-began).toBeLessThan(3000);
 const row=(await db.pool.query('SELECT *,extract(epoch FROM(next_attempt_at-clock_timestamp())) delay FROM tawsel.outbox_deliveries WHERE tenant_id=$1',[w.source.tenantId])).rows[0];
 expect(row.status).toBe('failed');expect(row.last_error).toBe(mode==='timeout'?'delivery_timeout':mode==='redirect'?'redirect_denied':mode==='invalid-ack'?'invalid_acknowledgement':'http_503');
 expect(Number(row.delay)).toBeLessThanOrEqual(300);expect(w.receiver.captures).toHaveLength(1);
});
test('B: destination authorization and DNS rebinding checks reject internal, wrong-source and ambient targets',async()=>{
 const w=await setupWire();
 for(const target of ['http://127.0.0.1:80/events','https://169.254.169.254/events','https://10.0.0.1/events','https://[::ffff:127.0.0.1]/events','https://example.com/events']){
  await expect(w.service.command(w.source.authorization,'integration.configureWebhook',w.source.command('integration.configureWebhook',{url:target,enabled:true,expectedRevision:1}))).rejects.toMatchObject({statusCode:400});
 }
 const publicUrl='https://receiver.example.com/events',policy={...w.config,testLoopback:false,destinations:[{...w.scope,url:publicUrl}]};
 await expect(resolveDestination(publicUrl,w.scope,policy,new AbortController().signal,async()=>['93.184.216.34','127.0.0.1'])).rejects.toMatchObject({code:'destination_denied'});
 await expect(resolveDestination(publicUrl,{...w.scope,integrationId:randomUUID()},policy,new AbortController().signal)).rejects.toMatchObject({code:'destination_denied'});
 expect(isPublicAddress('93.184.216.34')).toBe(true);
 for(const ip of ['0.0.0.0','100.64.0.1','127.0.0.1','169.254.1.2','10.0.0.2','172.16.0.1','192.168.1.1','198.18.0.1','224.0.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1'])expect(isPublicAddress(ip),ip).toBe(false);
});
test('B: accepted configuration recovery survives destination policy removal; changed same-ID input conflicts',async()=>{
 const w=await setupWire(),before=await w.service.command(w.source.authorization,w.configuration.operationId,w.configuration);
 w.config.destinations=[];
 expect(await w.service.command(w.source.authorization,w.configuration.operationId,w.configuration)).toEqual(before);
 const changed=structuredClone(w.configuration);changed.payload.enabled=false;
 await expect(w.service.command(w.source.authorization,changed.operationId,changed)).rejects.toMatchObject({code:'idempotency_conflict'});
 // Removing approval still prevents any new network delivery.
 await runOutboxOnce(db.pool,w.config);expect(w.receiver.captures).toHaveLength(0);
 expect((await db.pool.query('SELECT last_error FROM tawsel.outbox_deliveries WHERE tenant_id=$1',[w.source.tenantId])).rows[0].last_error).toBe('destination_denied');
});
test('A: independent claims are exclusive, expired completion is fenced and recipient sequences remain ordered',async()=>{
 const s=await ready();await s.change();
 const claims=await Promise.all([claimDelivery(db.pool),claimDelivery(db.pool)]);
 expect(claims.filter(Boolean)).toHaveLength(1);const first=claims.find(Boolean)!;
 expect(JSON.parse(first.body.toString()).aggregate.recipientSequence).toBe(1);
 await db.pool.query("UPDATE tawsel.outbox_deliveries SET lease_until=clock_timestamp()-interval '1 second' WHERE event_id=$1",[first.eventId]);const next=await claimDelivery(db.pool);
 expect(next?.eventId).toBe(first.eventId);expect(await completeDelivery(db.pool,first,{received:true})).toBe(false);
 expect(await completeDelivery(db.pool,next!,{received:true})).toBe(true);
 const second=await claimDelivery(db.pool);expect(second?.eventId).not.toBe(first.eventId);expect(JSON.parse(second!.body.toString()).aggregate.recipientSequence).toBe(2);
 await expect(db.pool.query('UPDATE tawsel.outbox_intents SET payload=$1 WHERE event_id=$2',[{},first.eventId])).rejects.toThrow('immutable');
 await expect(db.pool.query('UPDATE tawsel.outbox_deliveries SET body=$1 WHERE event_id=$2',[Buffer.from('{}'),first.eventId])).rejects.toThrow('immutable');
});
test('A: rollback consumes no sequence; hidden recipient and account events do not enter this stream',async()=>{
 const s=await ready(),other=await ready();
 const c=await db.pool.connect();try{await c.query('BEGIN');await c.query(`INSERT INTO tawsel.outbox_intents(tenant_id,event_id,source_id,action_id,recipient_id,event_type,payload_version,payload)
  SELECT tenant_id,$1,source_id,action_id,recipient_id,event_type,payload_version,payload FROM tawsel.outbox_intents WHERE tenant_id=$2 LIMIT 1`,[randomUUID(),s.tenantId]);await c.query('ROLLBACK');}finally{c.release();}
 await s.change();
 expect((await db.pool.query('SELECT recipient_sequence FROM tawsel.outbox_intents WHERE tenant_id=$1 ORDER BY recipient_sequence',[s.tenantId])).rows.map(r=>Number(r.recipient_sequence))).toEqual([1,2]);
 expect((await db.pool.query('SELECT recipient_sequence FROM tawsel.outbox_intents WHERE tenant_id=$1',[other.tenantId])).rows.map(r=>Number(r.recipient_sequence))).toEqual([1]);
 expect((await db.pool.query("SELECT d.* FROM tawsel.outbox_deliveries d JOIN tawsel.outbox_intents o USING(tenant_id,event_id) WHERE o.recipient_kind='account'")).rowCount).toBe(0);
});

test('C: unavailable recipient with a backlog cannot starve a healthy integration under bounded workers',async()=>{
 const unhealthy=await setupWire(),healthy=await setupWire();
 unhealthy.receiver.controls.mode='unavailable';for(let i=0;i<4;i++)await unhealthy.source.change(`branch-${i}`);
 const config={...healthy.config,destinations:[...unhealthy.config.destinations,...healthy.config.destinations],keys:[...unhealthy.config.keys,...healthy.config.keys]};
 await runOutboxBatch(db.pool,config,{},2);
 // Independent workers may lose the race for an endpoint, then retry next tick.
 if(!healthy.receiver.captures.length)await runOutboxBatch(db.pool,config,{},2);
 expect(healthy.receiver.captures).toHaveLength(1);expect(healthy.receiver.captures[0]?.signatureValid).toBe(true);
 const reads=new OutboxReads(db.pool),good=await reads.queue(healthy.source.authorization,100),bad=await reads.queue(unhealthy.source.authorization,100);
 expect(good.counts.received).toBe(1);expect(bad.counts.failed).toBe(1);expect(bad.counts.pending).toBe(4);
 expect(bad.items.filter(i=>i.blockedBy!==null)).toHaveLength(4);
 for(const fraction of [0,0.25,0.99])expect(retryDelay(1000,()=>fraction)).toBeGreaterThanOrEqual(150000);
 expect(retryDelay(1000,()=>0.99999)).toBeLessThanOrEqual(300000);
});
test('C: public HTTP reads, retry and paged replay are source scoped and expose received separately from unknown application',async()=>{
 const w=await setupWire(),sameTenantOther=await f.source(w.source.tenantId),otherTenant=await f.source();await w.source.change();
 const app=Fastify();await app.register(s=>outboxRoutes(s,db.pool,w.config));const address=await app.listen({host:'127.0.0.1',port:0});closers.push(()=>app.close());
 const client=new OutboxClient({baseUrl:address,authorization:w.source.authorization}),other=new OutboxClient({baseUrl:address,authorization:sameTenantOther.authorization});
 const page=await client.queue({limit:1});expect(outboxConforms('Queue',page)).toBe(true);expect(page.nextCursor).not.toBeNull();expect(page.counts.pending).toBe(2);
 const next=await client.queue({limit:1,cursor:page.nextCursor!});expect(next.items[0]?.eventId).not.toBe(page.items[0]?.eventId);expect(next.nextCursor).toBeNull();
 const firstReplay=await client.replay('integration',w.source.integrationId,0,1);expect(outboxConforms('Replay',firstReplay)).toBe(true);expect(firstReplay.events[0]?.aggregate.recipientSequence).toBe(1);expect(firstReplay.nextAfterSequence).toBe(1);
 const secondReplay=await client.replay('integration',w.source.integrationId,1,1);expect(secondReplay.events[0]?.aggregate.recipientSequence).toBe(2);expect(secondReplay.nextAfterSequence).toBeNull();
 const id=firstReplay.events[0]!.eventId;
 await expect(other.detail(id)).rejects.toMatchObject({status:403});expect((await other.replay('integration',w.source.integrationId)).events).toEqual([]);
 await expect(new OutboxClient({baseUrl:address,authorization:otherTenant.authorization}).detail(id)).rejects.toMatchObject({status:403});
 await expect(other.command(sameTenantOther.command('integration.retryDelivery',{eventId:id}) as Parameters<OutboxClient['command']>[0])).rejects.toMatchObject({status:403});
 await runOutboxOnce(db.pool,w.config);
 const detail=await client.detail(id);expect(outboxConforms('Detail',detail)).toBe(true);expect(detail.delivery).toMatchObject({status:'received',projectionStatus:'unknown',attempts:1});
 const retry=w.source.command('integration.retryDelivery',{eventId:id}) as Parameters<OutboxClient['command']>[0];const scheduled=await client.command(retry);expect(await client.command(retry)).toEqual(scheduled);
 await runOutboxOnce(db.pool,w.config);expect(w.receiver.captures).toHaveLength(2);expect(w.receiver.captures[1]!.body).toEqual(w.receiver.captures[0]!.body);
 const attempts=await client.detail(id,{limit:1});expect(attempts.attempts[0]?.number).toBe(2);expect(attempts.nextAttemptBefore).toBe(2);expect((await client.detail(id,{beforeAttempt:2,limit:1})).attempts[0]?.number).toBe(1);
 expect((await client.replay('integration',w.source.integrationId)).events).toEqual([firstReplay.events[0],secondReplay.events[0]]);
 await db.pool.query('UPDATE tawsel.integrations SET enabled=false WHERE tenant_id=$1 AND integration_id=$2',[w.source.tenantId,w.source.integrationId]);
 await expect(client.queue()).rejects.toMatchObject({status:403});expect(await runOutboxOnce(db.pool,w.config)).toBe(false);
},20_000);

test('A upgrade: real P24 committed intent becomes discoverable without a new business write and retains its identity/payload',async()=>{
 const old=await createTestDatabase(),directory=await mkdtemp(join(tmpdir(),'tawsel-p25-upgrade-'));
 const files=(await readdir(new URL('../../../../db/migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')&&n<'0024_');
 const app=Fastify();
 try{
  for(const name of files)await copyFile(new URL(`../../../../db/migrations/${name}`,import.meta.url),join(directory,name));
  await migrate(old.pool,pathToFileURL(directory+'/'));
  await app.register(s=>provisioningRoutes(s,old.pool,{issuer:'https://issuer.fixture.invalid',operatorToken},writeProjection));await app.ready();
  const source=await bindSource(app,[]),before=(await old.pool.query('SELECT event_id,payload,created_at FROM tawsel.outbox_intents')).rows;
  expect(before).toHaveLength(1);expect(await migrate(old.pool)).toEqual(['0024_outbox_delivery.sql','0025_consumer_checkpoints.sql','0026_replay_dependencies.sql','0027_reporting_provenance.sql','0028_worker_observations.sql']);
  const after=(await old.pool.query('SELECT event_id,payload,created_at FROM tawsel.outbox_intents')).rows;expect(after).toEqual(before);
  const queue=await new OutboxReads(old.pool).queue(`Bearer ${source.token}`,100);expect(queue.items).toHaveLength(1);expect(queue.items[0]).toMatchObject({eventId:before[0].event_id,status:'pending',aggregate:{recipientSequence:1}});
  await old.pool.query('INSERT INTO tawsel.outbox_endpoints(tenant_id,integration_id,url) VALUES($1,$2,$3)',[source.tenantId,source.integrationId,'https://receiver.fixture.invalid/events']);
  expect((await claimDelivery(old.pool))?.eventId).toBe(before[0].event_id);
  expect((await old.pool.query('SELECT count(*)::int n FROM tawsel.command_identities')).rows[0].n).toBe(1);
 }finally{await app.close();await old.close();for(const name of files)await unlink(join(directory,name));await rmdir(directory);}
},20_000);
