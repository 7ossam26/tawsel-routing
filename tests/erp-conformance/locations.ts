import type {components} from '../../packages/api-client/src/schema.js';
/** Additional P11 consumer invariant, usable for a captured location event or
 * authenticated review response. Runtime canonical validation is also required. */
export function assertConfirmedLocation(location:components['schemas']['LocationExecutionSnapshot']){
 if(location.locationReadiness!=='confirmed'||!location.pin)throw new Error('Task location unresolved');
 const {latitude,longitude}=location.pin.coordinates;
 if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)throw new Error('Invalid planning coordinate');
 if(location.pin.sourceRevision!==location.sourceRevision)throw new Error('Stale source confirmation');
 if(location.locationRevision>0&&(!location.pin.confirmedBy||!location.pin.confirmedAt))throw new Error('Missing explicit confirmation provenance');
 if(location.planningStatus==='pending'&&location.planningInputRevision<1)throw new Error('Missing planning input revision');
 return {taskId:location.taskId,sourceRevision:location.sourceRevision,locationRevision:location.locationRevision,coordinates:location.pin.coordinates};
}
