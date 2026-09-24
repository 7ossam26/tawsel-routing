import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import Fastify from 'fastify';
import type {components} from '@tawsel/api-client';
import {createTestDatabase} from '../apps/api/test/support/database.js';
import {prepareAccessFixture} from '../apps/api/test/support/access-fixture.js';
import {outcomeCompanyFixture} from '../apps/api/test/support/outcome-fixture.js';
import {operatorToken,send} from '../apps/api/test/support/provisioning-fixture.js';
import type {AuthConfig} from '../apps/api/src/auth/config.js';
import {correctionRoutes} from '../apps/api/src/corrections/routes.js';
import {outcomeRoutes} from '../apps/api/src/outcomes/routes.js';
import {deviceRoutes} from '../apps/api/src/devices/routes.js';
import {returnDriverRoutes,returnReceiverRoutes} from '../apps/api/src/returns/routes.js';
import {CorrectionsClient} from '../packages/api-client/src/corrections.js';
import {OutcomesClient} from '../packages/api-client/src/outcomes.js';
import {DevicesClient} from '../packages/api-client/src/devices.js';
import {ReturnsClient,returnReceiverClient} from '../packages/api-client/src/returns.js';
import {correctionConforms} from '../apps/api/src/corrections/models.js';
import {assertCorrectionDemo} from '../tests/erp-conformance/corrections.js';

export async function correctionDemo(){
 const db=await createTestDatabase();let f:Awaited<ReturnType<typeof outcomeCompanyFixture>>|undefined,app:ReturnType<typeof Fastify>|undefined,base='';
 try{
  await prepareAccessFixture(db.pool);f=await outcomeCompanyFixture(db,[{}]);const fixture=f;
  assert.equal((await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'Driver',capabilities:['execution.own','correction.own']}))).statusCode,200);
  const bootstrap=structuredClone(f.source.bootstrapCommand);bootstrap.actionId=randomUUID();bootstrap.payload.sourceRevision=3;bootstrap.payload.returnCapabilities=['return.receive'];assert.equal((await send(f.app,operatorToken,bootstrap)).statusCode,200);
  const config:AuthConfig={origin:'http://localhost',encryptionKey:Buffer.alloc(32,23),sessionSeconds:3600,issuers:{personal:{issuer:'https://issuer.fixture.invalid',clientId:'p23',clientSecret:'fixture'},company:{issuer:'https://issuer.fixture.invalid',clientId:'p23',clientSecret:'fixture'}}};
  const start=async()=>{const next=Fastify();app=next;for(const register of [correctionRoutes,outcomeRoutes,deviceRoutes,returnDriverRoutes])await next.register(s=>register(s,db.pool,config,(_r,_k,work)=>work(fixture.principal)));await next.register(s=>returnReceiverRoutes(s,db.pool));next.get('/api/session/bootstrap',async()=>({csrfToken:'p23-demo',fixture:true}));base=await next.listen({host:'127.0.0.1',port:0});config.origin=base;};await start();
  let drop=false;
  const transport:typeof fetch=async(url,init)=>{const response=await fetch(new URL(String(url),base),{...init,headers:{...init?.headers,origin:base,cookie:'__Host-tawsel-browser=p23-demo'}});if(drop&&String(url).startsWith('/api/v1/corrections/outcomes')){drop=false;await response.text();throw Error('Deliberately lost committed response');}return response;};
  const outcomes=new OutcomesClient('company',transport),corrections=new CorrectionsClient('company',transport),devices=new DevicesClient('company',transport),returns=new ReturnsClient('company',transport);
  const partial=f.make(0,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:{amountMinor:25000,currency:'EGP',exponent:2}}) as components['schemas']['OutcomePartialCommand'];assert.equal((await outcomes.partial(partial)).receipt.businessStatus,'accepted');
  const before=await outcomes.read(f.round.roundId),original=before.items[0]!;
  const command={...partial,actionId:randomUUID(),operationId:'outcome.correct',payload:{roundId:f.round.roundId,taskId:original.taskId,attemptId:original.attemptId,expectedOutcomeRevision:1,replacement:{outcome:'partial',pieces:[{sourceLineId:'pieces',delivered:1}],reportedCollection:{amountMinor:15000,currency:'EGP',exponent:2}}}} as components['schemas']['CorrectionCorrectCommand'];
  drop=true;await assert.rejects(()=>corrections.correct(command),/Deliberately lost/);await app!.close();app=undefined;await start();
  const recovered=await corrections.result(command.actionId),duplicate=await corrections.correct(command);assert.deepEqual(duplicate,recovered.result);const corrected=await outcomes.read(f.round.roundId);
  const takeover=f.planCommand('device.takeOver',{roundId:f.round.roundId,expectedGeneration:1});delete takeover.payload.driverId;if(takeover.context.kind!=='device')throw Error('device');takeover.context.deviceId=randomUUID();
  const transfer=await devices.continueOnThisPhone(takeover as components['schemas']['DeviceTakeoverCommand']);assert.ok(transfer.snapshot);
  const device={...takeover.context,deviceGeneration:2,snapshotToken:transfer.snapshot.snapshotToken!};
  const old={...partial,actionId:randomUUID()},received=await devices.receive(old),adoption={...old,actionId:randomUUID(),operationId:'evidence.adoptCompatible',context:device,payload:{roundId:f.round.roundId,evidenceActionId:old.actionId,evidenceReceiptId:received.result.receipt.receiptId,expectedGeneration:2,expectedOutcomeRevision:2,expectedActivityRevision:1,expectedSourceRevision:1,expectedAssignmentRevision:1,expectedPinRevision:0}} as components['schemas']['DeviceAdoptionCommand'];
  const adopted=await corrections.adopt(adoption);assert.equal(adopted.receipt.businessStatus,'accepted');const afterAdoption=await outcomes.read(f.round.roundId);
  const line=(await returns.groups()).groups[0]!.items[0]!,offer=f.planCommand('return.requestHandover',{roundId:f.round.roundId,sourceBranchId:original.branchId,items:[{taskId:line.taskId,dispatchCycleId:line.dispatchCycleId,outcomeId:line.outcomeId,sourceLineId:line.sourceLineId,quantity:1}]});delete offer.payload.driverId;offer.context=device;
  const requested=await returns.offer(offer as components['schemas']['ReturnRequestCommand']),request=(requested.response!.body as components['schemas']['ReturnCommandResult']).request;
  const native=returnReceiverClient(base,f.source.token),receiptCommand=f.source.command('return.confirmSubsetReceipt',{requestId:request.requestId,receivingBranchId:request.sourceBranchId,items:[{itemId:request.items[0]!.itemId,expectedRevision:0,quantity:1}]});
  const receipt=await native.command(receiptCommand as components['schemas']['ReturnReceiveCommand']);assert.equal(receipt.status,200);
  const incompatible={...command,context:device,actionId:randomUUID(),payload:{...command.payload,expectedOutcomeRevision:3},observation:{...command.observation,observedAt:'2000-01-01T00:00:00Z'}},denied=await corrections.correct(incompatible),availability=await corrections.availability(original.attemptId,device.deviceId),final=await outcomes.read(f.round.roundId);
  const events=(await db.pool.query("SELECT event_type,recipient_kind,payload FROM tawsel.outbox_intents WHERE tenant_id=$1 AND event_type IN ('outcome.corrected','evidence.adoptionResolved') ORDER BY created_at,event_id",[f.tenantId])).rows;
  for(const e of events)assert.ok(correctionConforms(e.event_type==='outcome.corrected'?'Event':'AdoptionEvent',e.payload));
  const report={evidence:'Real loopback HTTP, PostgreSQL, public clients, committed-response loss and API restart. Identity/bootstrap and source provisioning are fixtures; pending events are local durable intent, not signed delivery or ERP application.',before,corrected,afterAdoption,final,recovered,duplicate,adopted,denied,availability,events};assertCorrectionDemo(report);return report;
 }finally{await app?.close();await f?.close();await db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const report=await correctionDemo();await mkdir(new URL('../.local/',import.meta.url),{recursive:true});await writeFile(new URL('../.local/phase-23-demo.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log('PASS: 2 pieces/25000 → corrected 1/15000 → explicit old-phone adoption 2/25000 → actual receipt blocks correction. Lost-response recovery and API restart verified. Report: .local/phase-23-demo.json');}
