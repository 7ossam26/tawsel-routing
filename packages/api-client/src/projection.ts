import type {components} from './schema.js';
import type {Event} from './validation.js';
export type ProjectionState=components['schemas']['ConsumerState'];
export const emptyProjection=():ProjectionState=>({task:null,outcomes:[],returnRequest:null,returnItems:[],notices:[]});
/** Pure public reference mapping. A snapshot is current state, never evidence
 * that its preceding transition history was received or processed by a consumer. */
export function projectEvent(previous:ProjectionState,event:Event):ProjectionState{
 const state=structuredClone(previous),p=event.payload;
 if('task' in p){state.task=p.task as components['schemas']['B2bTask'];}
 else if(event.eventType==='outcome.recorded'||event.eventType==='outcome.corrected'){
  const correction=p.correction as components['schemas']['CorrectionRecord']|undefined;
  const outcome=(p.outcome??correction?.outcome) as components['schemas']['OutcomeRecord'];
  const old=state.outcomes.find(o=>o.attemptId===outcome.attemptId);
  if(old&&outcome.revision<=old.revision)throw new Error('Outcome revision did not advance');
  if(correction&&old&&(correction.previousOutcomeId!==old.outcomeId||correction.previousRevision!==old.revision))throw new Error('Correction predecessor mismatch');
  state.outcomes=state.outcomes.filter(o=>o.attemptId!==outcome.attemptId);state.outcomes.push(outcome);
 }else if(event.eventType==='return.requested'){
  const request=p.request as components['schemas']['ReturnRequestView'];state.returnRequest=request;
  state.returnItems=request.items.map(i=>({itemId:i.itemId,taskId:i.taskId,sourceLineId:i.sourceLineId,requested:i.requested,received:i.received,lost:i.lost,damaged:i.damaged,unresolved:i.unresolved}));
 }else if(event.eventType==='return.subsetReceived'||event.eventType==='return.dispositionRecorded'){
  const t=p.transition as components['schemas']['ReturnTransition'],item=state.returnItems.find(i=>i.itemId===t.itemId);
  if(!item||state.returnRequest?.requestId!==t.requestId||item.taskId!==t.taskId||item.sourceLineId!==t.sourceLineId||item.unresolved<t.quantity)throw new Error('Return dependency or quantity mismatch');
  item[t.kind]+=t.quantity;item.unresolved-=t.quantity;
 }else{
  const key=event.eventType==='provisioning.changed'?`${event.eventType}/${String(p.entity)}/${String(p.resourceId)}`:event.eventType;
  state.notices=state.notices.filter(n=>n.key!==key);state.notices.push({key,event:event as components['schemas']['SenderEvent']});
 }
 if(state.outcomes.length>1000||state.returnItems.length>1000||state.notices.length>1000)throw new Error('projection_limit');
 return state;
}
