import {mkdir,writeFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import Fastify from 'fastify';
import type {components} from '@tawsel/api-client';
import {createTestDatabase} from '../apps/api/test/support/database.js';
import {prepareAccessFixture} from '../apps/api/test/support/access-fixture.js';
import {outcomeCompanyFixture} from '../apps/api/test/support/outcome-fixture.js';
import {controlledReceiver} from '../apps/api/test/support/outbox-receiver.js';
import {operatorToken,send} from '../apps/api/test/support/provisioning-fixture.js';
import {Outcomes} from '../apps/api/src/outcomes/service.js';
import {Corrections} from '../apps/api/src/corrections/service.js';
import {Returns} from '../apps/api/src/returns/service.js';
import {ReturnReceiver} from '../apps/api/src/returns/receiver.js';
import {outboxRoutes} from '../apps/api/src/outbox/routes.js';
import {runOutboxOnce} from '../apps/api/src/outbox/worker.js';
import {OutboxClient} from '../packages/api-client/src/outbox.js';
import {checkOutboxCapture,type OutboxCapture} from '../tests/erp-conformance/outbox.js';

/** Shared P25/P26 scenario preparation: actual prior domain commands/commits
 * and real PostgreSQL. Identity/provider setup is a labelled fixture; the demo
 * wrappers below and in receiver-demo.ts exercise the public signed HTTP boundary. */
export async function prepareOutboxBusiness(){
 const db=await createTestDatabase();await prepareAccessFixture(db.pool);
 const f=await outcomeCompanyFixture(db,[{},{}]);
 const scope={tenantId:f.source.tenantId,integrationId:f.source.integrationId},key={keyId:'demo_v1',secret:randomBytes(32).toString('hex')};
 try{
  const bootstrap=structuredClone(f.source.bootstrapCommand);bootstrap.actionId=randomUUID();bootstrap.payload.sourceRevision=3;bootstrap.payload.returnCapabilities=['return.receive','return.dispose'];
  if((await send(f.app,operatorToken,bootstrap)).statusCode!==200)throw new Error('Return source grant');
  if((await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'Driver',capabilities:['execution.own','correction.own']}))).statusCode!==200)throw new Error('Correction source grant');
  const outcomes=new Outcomes(db.pool);await outcomes.command(f.principal,f.make(0,'outcome.recordNoAnswer'));
  await outcomes.command(f.principal,f.make(1,'outcome.recordNoAnswer',{},1));
  const original=(await outcomes.read(f.principal,f.round.roundId)).items[0]!;
  const correction=f.planCommand('outcome.correct',{roundId:f.round.roundId,taskId:original.taskId,attemptId:original.attemptId,expectedOutcomeRevision:original.revision,replacement:{outcome:'partial',pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:{amountMinor:25000,currency:'EGP',exponent:2}}});delete correction.payload.driverId;
  if((await new Corrections(db.pool).command(f.principal,correction)).receipt.businessStatus!=='accepted')throw new Error('Correction failed');
  const returns=new Returns(db.pool),group=(await returns.groups(f.principal)).groups[0]!,item=group.items.find(i=>i.taskId===original.taskId)!;
  const requestCommand=f.planCommand('return.requestHandover',{roundId:f.round.roundId,sourceBranchId:group.sourceBranchId,items:[{taskId:item.taskId,dispatchCycleId:item.dispatchCycleId,outcomeId:item.outcomeId,sourceLineId:item.sourceLineId,quantity:1}]});delete requestCommand.payload.driverId;
  const returned=await returns.request(f.principal,requestCommand),request=returned.response!.body.request as components['schemas']['ReturnRequestView'];
  const receipt=f.source.command('return.confirmSubsetReceipt',{requestId:request.requestId,receivingBranchId:request.sourceBranchId,items:[{itemId:request.items[0]!.itemId,expectedRevision:request.items[0]!.revision,quantity:1}]});
  if((await new ReturnReceiver(db.pool).command(`Bearer ${f.source.token}`,'return.confirmSubsetReceipt',receipt)).receipt.businessStatus!=='accepted')throw new Error('Actual receipt failed');
  return {db,f,scope,key,async close(){await f.close();await db.close();}};
 }catch(e){await f.close();await db.close();throw e;}
}
export async function outboxDemo(){
 const {db,f,scope,key,close}=await prepareOutboxBusiness();
 const receiver=await controlledReceiver(scope,[key]),app=Fastify();
 const config={encryptionKey:randomBytes(32),keys:[{...scope,...key}],destinations:[{...scope,url:receiver.url}],testLoopback:true};
 try{
  // All business events above were committed before configuring/starting sender.
  await app.register(s=>outboxRoutes(s,db.pool,config));const baseUrl=await app.listen({host:'127.0.0.1',port:0});
  const client=new OutboxClient({baseUrl,authorization:`Bearer ${f.source.token}`});
  const command=(op:string,payload:object)=>f.source.command(op,payload) as Parameters<OutboxClient['command']>[0];
  await client.command(command('integration.configureWebhook',{url:receiver.url,enabled:true,expectedRevision:0}));
  await client.command(command('integration.rotateSigningKey',{keyId:key.keyId,overlapSeconds:300}));
  receiver.controls.mode='lose-response';await runOutboxOnce(db.pool,config);
  if(!receiver.captures[0])throw new Error('No wire receipt');
  await client.command(command('integration.retryDelivery',{eventId:receiver.captures[0].event.eventId}));
  receiver.controls.mode='received';
  for(let i=0;i<100;i++){await runOutboxOnce(db.pool,config);const q=await client.queue({limit:100});if(q.counts.pending+q.counts.sending+q.counts.failed===0)break;}
  const capture:OutboxCapture={scope,fixtureKeys:[key],acknowledgementLevel:receiver.acknowledgementLevel,deliveries:receiver.captures.map(c=>({bodyBase64:c.body.toString('base64'),headers:c.headers})),queue:await client.queue({limit:100})};
  const result=checkOutboxCapture(capture);
  for(const name of ['task.snapshotAccepted','assignment.received','outcome.recorded','outcome.corrected','return.requested','return.subsetReceived'])if(!result.eventTypes.includes(name))throw new Error(`Missing real domain event: ${name}`);
  return {capture,result};
 }finally{await app.close();await receiver.close();await close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const {capture,result}=await outboxDemo();await mkdir('.local',{recursive:true});await writeFile('.local/phase-25-demo.json',JSON.stringify(capture,null,2)+'\n');console.log(JSON.stringify({...result,capture:'.local/phase-25-demo.json'},null,2));}
