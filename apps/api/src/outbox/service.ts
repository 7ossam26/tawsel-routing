import type {Pool} from 'pg';
import {withTransaction} from '../db/transaction.js';
import {authenticateService,unavailable} from '../provisioning/credentials.js';
import {executeCommandInTransaction,getCommandResult,IdempotencyConflict,type ActionEnvelope} from '../commands/kernel.js';
import {payloadHash} from '../commands/json.js';
import {ProvisioningError} from '../provisioning/schema.js';
import {seal} from '../auth/crypto.js';
import {requireOutbox} from './validation.js';
import {resolveDestination,DeliveryFailure} from './destination.js';
import type {OutboxConfig} from './config.js';

const operations={'integration.configureWebhook':'ConfigureWebhookCommand','integration.rotateSigningKey':'RotateSigningKeyCommand','integration.retryDelivery':'RetryDeliveryCommand'} as const;
export class OutboxService {
 constructor(readonly pool:Pool,readonly config:OutboxConfig){}
 async command(authorization:string|undefined,operation:string,value:unknown){
  if(!(operation in operations))throw unavailable();
  requireOutbox(operations[operation as keyof typeof operations],value);
  const c=structuredClone(value) as ActionEnvelope;
  const thisConfig=this.config;
  const initial=await withTransaction(this.pool,async tx=>{
   const binding=await authenticateService(tx,authorization,false,'integration.manage');
   if(c.context.kind!=='integration'||c.context.tenantId!==binding.tenantId||c.context.integrationId!==binding.integrationId||c.context.assertedActorId!==undefined)throw unavailable();
   const scope={tenantId:binding.tenantId,sourceId:binding.integrationId};
   const existing=(await tx.query('SELECT payload_hash FROM tawsel.command_identities WHERE tenant_id=$1 AND source_id=$2 AND action_id=$3',[scope.tenantId,scope.sourceId,c.actionId])).rows[0];
   if(existing&&existing.payload_hash!==payloadHash({envelope:c,actorId:null}))throw new IdempotencyConflict();
   return {binding,result:existing?await getCommandResult(tx,scope,c.actionId):null};
  });
  // Recovery of an accepted configuration must not depend on today's DNS or
  // allowlist. Current authorization and the original semantic hash still apply.
  if(initial.result)return initial.result;
  const binding=initial.binding;
  if(operation==='integration.configureWebhook'){
   try{await resolveDestination(String(c.payload.url),binding,this.config,AbortSignal.timeout(5000));}
   catch(e){throw new ProvisioningError('validation_failed',400,e instanceof DeliveryFailure?e.code:'destination_unavailable');}
  }
  return withTransaction(this.pool,async tx=>{
   const b=await authenticateService(tx,authorization,true,'integration.manage'),scope={tenantId:b.tenantId,sourceId:b.integrationId};
   return executeCommandInTransaction(tx,scope,c,{
    async writeDomain(){
     const p=c.payload,key=[b.tenantId,b.integrationId];let body:Record<string,unknown>;
     if(operation==='integration.configureWebhook'){
      const row=(await tx.query('SELECT revision FROM tawsel.outbox_endpoints WHERE tenant_id=$1 AND integration_id=$2 FOR UPDATE',key)).rows[0];
      if(Number(row?.revision??0)!==p.expectedRevision)throw new ProvisioningError('stale_revision',409,'Endpoint revision changed');
      const revision=Number(row?.revision??0)+1;
      await tx.query(`INSERT INTO tawsel.outbox_endpoints(tenant_id,integration_id,url,enabled,revision) VALUES($1,$2,$3,$4,$5)
       ON CONFLICT(tenant_id,integration_id) DO UPDATE SET url=$3,enabled=$4,revision=$5`,[...key,p.url,p.enabled,revision]);
      body={revision,url:p.url,enabled:p.enabled};
     }else if(operation==='integration.rotateSigningKey'){
      const material=thisConfig.keys.find(k=>k.tenantId===b.tenantId&&k.integrationId===b.integrationId&&k.keyId===p.keyId);
      if(!material)throw new ProvisioningError('validation_failed',400,'Signing key is not provisioned for this source');
      if((await tx.query('SELECT 1 FROM tawsel.outbox_signing_keys WHERE tenant_id=$1 AND integration_id=$2 AND key_id=$3',[...key,p.keyId])).rowCount)throw new ProvisioningError('idempotency_conflict',409,'Key ID is permanently reserved; retry the original action');
      const now=(await tx.query<{now:Date}>('SELECT clock_timestamp() now')).rows[0]!.now;
      const verifyUntil=new Date(now.getTime()+Number(p.overlapSeconds)*1000);
      const old=(await tx.query(`UPDATE tawsel.outbox_signing_keys SET retired_at=$3,verify_until=$4
       WHERE tenant_id=$1 AND integration_id=$2 AND retired_at IS NULL RETURNING key_id`,[...key,now,verifyUntil])).rows[0];
      await tx.query('INSERT INTO tawsel.outbox_signing_keys(tenant_id,integration_id,key_id,encrypted_secret,activated_at) VALUES($1,$2,$3,$4,$5)',[...key,p.keyId,seal(JSON.stringify(material),thisConfig.encryptionKey),now]);
      body={keyId:p.keyId,activatedAt:now.toISOString(),previousKeyId:old?.key_id??null,verifyUntil:old?verifyUntil.toISOString():null};
     }else{
      const delivery=(await tx.query('SELECT * FROM tawsel.outbox_deliveries WHERE tenant_id=$1 AND recipient_id=$2 AND event_id=$3 FOR UPDATE',[...key,p.eventId])).rows[0];
      if(!delivery)throw unavailable();
      if(delivery.status==='sending'&&new Date(delivery.lease_until as string).getTime()>Date.now())throw new ProvisioningError('stale_revision',409,'Delivery has an active lease');
      if(delivery.lease_id)await tx.query("UPDATE tawsel.outbox_delivery_attempts SET result='lease-expired',finished_at=clock_timestamp(),error_code='lease_expired' WHERE tenant_id=$1 AND attempt_id=$2 AND result='sending'",[b.tenantId,delivery.lease_id]);
      await tx.query("UPDATE tawsel.outbox_deliveries SET status='pending',next_attempt_at=clock_timestamp(),lease_id=null,lease_until=null WHERE tenant_id=$1 AND event_id=$2",[b.tenantId,p.eventId]);
      body={eventId:p.eventId,scheduled:true};
     }
     return {status:'accepted',response:{status:200,body},summary:body,audit:{operation,eventId:p.eventId??null,keyId:p.keyId??null,configurationChanged:operation==='integration.configureWebhook'},resourceVersions:{},intents:[]};
    },async writeProgress(){/* Operational state is already transactional. */}
   });
  });
 }
}
