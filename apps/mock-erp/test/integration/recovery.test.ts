import {randomBytes,randomUUID} from 'node:crypto';
import {expect,test} from 'vitest';
import Fastify from 'fastify';
import type {components} from '@tawsel/api-client';
import {OutboxClient} from '@tawsel/api-client/outbox';
import {canonicalJson} from '@tawsel/api-client/validation';
import {signWebhook} from '@tawsel/api-client/webhook-signature';
import {prepareOutboxBusiness} from '../../../../scripts/outbox-demo.js';
import {createReceiverDatabase} from '../../../../scripts/mock-erp-database.js';
import {outboxRoutes} from '../../../api/src/outbox/routes.js';
import {bindSource} from '../../../api/test/support/provisioning-fixture.js';
import {migrateReceiver} from '../../src/database.js';
import {receiverApp} from '../../src/app.js';
import {applyInboxOnce,consumerStatus} from '../../src/projection.js';
import {reconcileStream,adoptSnapshot,reportCheckpoint} from '../../src/recovery.js';
import type {ReceiverConfig} from '../../src/config.js';

async function fixture(){
 const f=await prepareOutboxBusiness(),db=await createReceiverDatabase(),app=Fastify();await app.register(s=>outboxRoutes(s,f.db.pool));const url=await app.listen({host:'127.0.0.1',port:0});
 const c:ReceiverConfig={...f.scope,keys:[f.key],statusToken:randomBytes(32).toString('hex'),host:'127.0.0.1',port:0,testLoopback:true,tawselBaseUrl:url,tawselAuthorization:`Bearer ${f.f.source.token}`};await migrateReceiver(db.pool,c);
 const receiver=receiverApp(db.pool,c),callback=await receiver.listen({host:'127.0.0.1',port:0});
 const api=new OutboxClient({baseUrl:url,authorization:c.tawselAuthorization!}),aggregate={type:'task' as const,id:f.f.tasks[0]!};
 const events=(await api.replay(aggregate.type,aggregate.id,0,100)).events;
 async function send(e:components['schemas']['EventEnvelope']){const body=Buffer.from(canonicalJson(e));return fetch(`${callback}/api/v1/consumer/events`,{method:'POST',headers:{'content-type':'application/json',...signWebhook(body,c,f.key,String(Date.now()))},body});}
 return {f,db,app,c,api,aggregate,events,send,async close(){await receiver.close();await app.close();await db.close();await f.close();}};
}
test('C: out-of-order buffer recovers with scoped HTTP replay and separately reports durable applied state',async()=>{
 const f=await fixture();try{
  const head=f.events.length;expect(head).toBeGreaterThan(3);
  expect((await f.send(f.events.at(-1)!)).status).toBe(200);expect(await applyInboxOnce(f.db.pool)).toBe(false);
  expect((await consumerStatus(f.db.pool,f.c,f.aggregate)).checkpoint).toMatchObject({receivedThrough:0,receivedHigh:head,appliedThrough:0,lastError:'sequence_gap'});
  const status=await reconcileStream(f.db.pool,f.c,f.aggregate);expect(status.checkpoint).toMatchObject({receivedThrough:head,appliedThrough:head,historyComplete:true,lastError:null});
  expect(status.state!.outcomes[0]!.lines[0]!.delivered).toBe(2);
  await reportCheckpoint(f.db.pool,f.c,f.aggregate);const report=(await f.api.applied(f.aggregate.type,f.aggregate.id)).report!;expect(report.evidence).toBe('receiver-reported');expect(report.checkpoint.appliedThrough).toBe(head);
  // Lost checkpoint response: resend the identical durable command without a new identity.
  const command=(await f.db.pool.query('SELECT command FROM mock_erp.checkpoint_reports')).rows[0].command as components['schemas']['ConsumerReportCommand'];
  expect((await f.api.command(command)).receipt.businessStatus).toBe('accepted');
  await expect(f.api.command({...command,actionId:randomUUID(),payload:{...command.payload,appliedThrough:0,revision:command.payload.revision-1}})).rejects.toMatchObject({status:409});
  const other=await bindSource(f.f.f.app,[],f.f.scope.tenantId),foreign=new OutboxClient({baseUrl:f.c.tawselBaseUrl!,authorization:`Bearer ${other.token}`});
  await expect(foreign.snapshot('task',f.aggregate.id)).rejects.toMatchObject({status:403});await expect(foreign.applied('task',f.aggregate.id)).rejects.toMatchObject({status:403});
  await expect(foreign.command({...command,actionId:randomUUID(),context:{kind:'integration',tenantId:f.c.tenantId,integrationId:other.integrationId}})).rejects.toMatchObject({status:403});
 }finally{await f.close();}
},45000);
test('C: actual missing retained payload returns 410; cached checkpoint restores current quantities without inventing history; late mandatory transitions still apply once',async()=>{
 const f=await fixture();try{
  const snapshot=await f.api.snapshot('task',f.aggregate.id),head=f.events.length;
  const ids=f.events.slice(0,-1).map(e=>e.eventId);
  // Destructive retention fault in this disposable database only. No production purge exists.
  const retentionFault=await f.f.db.pool.connect();try{
   await retentionFault.query('BEGIN');await retentionFault.query('SET LOCAL session_replication_role=replica');
   await retentionFault.query('DELETE FROM tawsel.outbox_deliveries WHERE event_id=ANY($1::uuid[])',[ids]);
   await retentionFault.query('DELETE FROM tawsel.outbox_intents WHERE event_id=ANY($1::uuid[])',[ids]);await retentionFault.query('COMMIT');
  }catch(e){await retentionFault.query('ROLLBACK');throw e;}finally{retentionFault.release();}
  await expect(f.api.replay('task',f.aggregate.id)).rejects.toMatchObject({status:410,code:'replay_expired'});
  expect((await f.send(f.events.at(-1)!)).status).toBe(200);
  const status=await reconcileStream(f.db.pool,f.c,f.aggregate);
  expect(status.state).toEqual(snapshot.state);expect(status.checkpoint).toMatchObject({appliedThrough:0,projectedThrough:head,snapshotThrough:head,historyComplete:false,lastError:'history_unavailable'});
  expect((await f.db.pool.query('SELECT * FROM mock_erp.transitions')).rows).toHaveLength(1);
  await reportCheckpoint(f.db.pool,f.c,f.aggregate);expect((await f.api.applied('task',f.aggregate.id)).report!.checkpoint.historyComplete).toBe(false);
  // An older replacement state cannot regress current projection.
  const older={...snapshot,throughSequence:1,state:{...snapshot.state,outcomes:[]}};expect(await adoptSnapshot(f.db.pool,f.c,f.aggregate,older)).toBe(false);
  for(const e of f.events){expect((await f.send(e)).status).toBe(200);await applyInboxOnce(f.db.pool);}
  const recovered=await consumerStatus(f.db.pool,f.c,f.aggregate);expect(recovered.checkpoint).toMatchObject({appliedThrough:head,historyComplete:true});expect(recovered.state).toEqual(snapshot.state);
  expect((await f.db.pool.query('SELECT * FROM mock_erp.transitions')).rows).toHaveLength(head);
  expect(recovered.state!.outcomes[0]!.collection.reported!.amountMinor).toBe(25000);
  // Without the independently retained checkpoint, missing history is an honest failure.
  await f.f.db.pool.query('DELETE FROM tawsel.outbox_projection_snapshots WHERE aggregate_id=$1',[f.aggregate.id]);
  await expect(f.api.snapshot('task',f.aggregate.id)).rejects.toMatchObject({status:503,code:'dependency_unavailable'});
 }finally{await f.close();}
},45000);
