import type { components } from '@tawsel/api-client';
import { canonicalJson } from '../commands/json.js';

export interface Intent {
 tenant_id:string; event_id:string; recipient_id:string; action_id:string;
 event_type:string; payload_version:string; payload:Record<string,unknown>;
 aggregate_type:components['schemas']['EventEnvelope']['aggregate']['type'];
 aggregate_id:string; recipient_sequence:string; created_at:Date;
}
/** Only committed, already recipient-filtered intent is projected. Never load a
 * current mixed-source resource or attach the original command's resource set. */
export function envelope(intent:Intent):components['schemas']['EventEnvelope'] {
 const p=intent.payload;
 const correction=p.correction as Record<string,unknown>|undefined;
 const fact=(p.task??p.outcome??correction?.outcome??p.location??p.change??p.transition??p.request??p) as Record<string,unknown>;
 const resources:Record<string,string>={},versions:Record<string,number>={};
 for(const name of ['taskId','dispatchCycleId','workdayId','planId','attemptId'])if(typeof fact[name]==='string')resources[name]=fact[name];
 if(typeof fact.roundId==='string')resources.tripId=fact.roundId;
 for(const name of ['sourceRevision','outcomeRevision','locationRevision'])if(Number.isSafeInteger(fact[name]))versions[name]=fact[name] as number;
 if((p.outcome||correction?.outcome)&&Number.isSafeInteger(fact.revision))versions.outcomeRevision=fact.revision as number;
 // Shared route/activity revisions are deliberately absent from the envelope.
 const sourceReference=fact.sourceReference as components['schemas']['SourceReference']|undefined;
 return {schemaVersion:'1.0.0',payloadVersion:intent.payload_version as '1.0.0',eventId:intent.event_id,eventType:intent.event_type,
  eventKind:'transition',tenantId:intent.tenant_id,recipientIntegrationId:intent.recipient_id,
  aggregate:{type:intent.aggregate_type,id:intent.aggregate_id,recipientSequence:Number(intent.recipient_sequence)},
  resources,versions,correlation:{actionId:intent.action_id,...(sourceReference?{sourceReference}:{})},
  committedAt:intent.created_at.toISOString(),payload:p};
}
export const eventBytes=(intent:Intent)=>Buffer.from(canonicalJson(envelope(intent)),'utf8');
