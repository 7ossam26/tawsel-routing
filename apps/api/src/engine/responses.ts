import { EngineError, validateModel, type Coordinates, type OptimizationInput, type OptimizationResult, type RouteInput, type RouteResult, type TableInput, type TableResult } from './models.js';
import { DEFAULT_CUSTOMER_SERVICE_SECONDS, optimizationRequest } from './requests.js';

function invalid(): never { throw new EngineError('invalid_response'); }
function record(value: unknown): Record<string,unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value as Record<string,unknown>;
}
function list(value: unknown): unknown[] { if (!Array.isArray(value)) invalid(); return value; }
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value<0 || value>Number.MAX_SAFE_INTEGER) invalid();
  return value;
}
function coordinates(value: unknown): Coordinates {
  const pair=list(value);
  if (pair.length!==2) invalid();
  const result={longitude:pair[0],latitude:pair[1]};
  // Coordinate validation allows signed values but never numeric strings.
  if (typeof result.latitude!=='number' || typeof result.longitude!=='number' || !Number.isFinite(result.latitude) || !Number.isFinite(result.longitude) || Math.abs(result.latitude)>90 || Math.abs(result.longitude)>180) invalid();
  return {latitude:result.latitude,longitude:result.longitude};
}
function same(a:Coordinates,b:Coordinates): boolean { return Math.abs(a.latitude-b.latitude)<0.000001 && Math.abs(a.longitude-b.longitude)<0.000001; }
function close(a:number,b:number,tolerance=0.001): void { if (Math.abs(a-b)>tolerance) invalid(); }
function osrm(raw: unknown): Record<string,unknown> {
  const r=record(raw);
  if (r.code==='NoRoute') throw new EngineError('no_route','osrm');
  if (r.code==='NoTable') throw new EngineError('no_table','osrm');
  if (typeof r.code!=='string') invalid();
  if (r.code!=='Ok') throw new EngineError('provider_error','osrm');
  return r;
}
function waypoints(value:unknown,count:number): void {
  const items=list(value); if(items.length!==count) invalid();
  for(const item of items) coordinates(record(item).location);
}
export function routeResponse(input: RouteInput, raw: unknown): RouteResult {
  const r=osrm(raw),routes=list(r.routes);
  waypoints(r.waypoints,input.coordinates.length);
  if(routes.length!==1) invalid();
  const route=record(routes[0]),geometry=record(route.geometry);
  if(geometry.type!=='LineString') invalid();
  const legs=list(route.legs).map(l=>{const leg=record(l);return {durationSeconds:number(leg.duration),distanceMetres:number(leg.distance)};});
  if(legs.length!==input.coordinates.length-1) invalid();
  const result:RouteResult={mode:input.mode,status:'complete',geometrySource:'osrm-road',geometry:list(geometry.coordinates).map(coordinates),durationSeconds:number(route.duration),distanceMetres:number(route.distance),legs};
  const snapped=list(r.waypoints).map(p=>coordinates(record(p).location));
  if(!result.geometry[0] || !result.geometry.at(-1) || !same(result.geometry[0],snapped[0]!) || !same(result.geometry.at(-1)!,snapped.at(-1)!)) invalid();
  // OSRM rounds each leg and aggregate to tenths independently.
  close(result.durationSeconds,legs.reduce((sum,l)=>sum+l.durationSeconds,0),0.1*legs.length);
  close(result.distanceMetres,legs.reduce((sum,l)=>sum+l.distanceMetres,0),0.1*legs.length);
  validateModel('RouteResult',result,true);return result;
}
export function tableResponse(input: TableInput, raw: unknown): TableResult {
  const r=osrm(raw),n=input.coordinates.length;
  waypoints(r.sources,n);waypoints(r.destinations,n);
  if (r.fallback_speed_cells!==undefined && list(r.fallback_speed_cells).length) invalid();
  const durations=list(r.durations),distances=list(r.distances);
  if(durations.length!==n || distances.length!==n) invalid();
  let partial=false;
  const cells:TableResult['cells']=durations.map((row,i)=>{
    const times=list(row),lengths=list(distances[i]);
    if(times.length!==n || lengths.length!==n) invalid();
    return times.map((duration,j)=>{
      const distance=lengths[j];
      if(duration===null || distance===null) {
        if(duration!==null || distance!==null) invalid();
        partial=true;return {status:'unreachable' as const};
      }
      return {status:'reachable' as const,durationSeconds:number(duration),distanceMetres:number(distance)};
    });
  });
  const result:TableResult={mode:input.mode,status:partial?'partial':'complete',cells};
  validateModel('TableResult',result,true);return result;
}
/** Validates a single-vehicle provider candidate. Does not claim urgent-first, eligibility or publication. */
export function optimizationResponse(input: OptimizationInput, raw: unknown): OptimizationResult {
  const {ids}=optimizationRequest(input),r=record(raw);
  if(typeof r.code!=='number' || !Number.isInteger(r.code)) invalid();
  if(r.code!==0) throw new EngineError('provider_error','vroom');
  const routes=list(r.routes),unassigned=list(r.unassigned),summary=record(r.summary);
  if(routes.length>1 || summary.routes!==routes.length || summary.unassigned!==unassigned.length) invalid();
  const seen=new Set<number>();
  const resolve=(value:unknown)=>{
    if(typeof value!=='number' || !Number.isInteger(value) || seen.has(value) || !ids.has(value)) invalid();
    seen.add(value);return ids.get(value)!;
  };
  const unassignedTaskIds=unassigned.map(value=>{
    const job=record(value);if(job.type!=='job') invalid();return resolve(job.id).taskId;
  });
  const visits:OptimizationResult['visits']=[];
  let travel=0,distance=0,service=0,waiting=0,finish=0;
  if(list(summary.violations).length) invalid();
  if(routes.length) {
    const route=record(routes[0]);if(route.vehicle!==1 || list(route.violations).length || number(route.setup)!==0) invalid();
    const steps=list(route.steps);if(steps.length<3 || steps.length>input.tasks.length+2) invalid();
    let previousDeparture=0,previousTravel=0,previousDistance=0;
    for(const [index,value] of steps.entries()) {
      const step=record(value),arrival=number(step.arrival),cumulative=number(step.duration),metres=number(step.distance),dwell=number(step.service),wait=number(step.waiting_time),point=coordinates(step.location);
      if(number(step.setup)!==0 || list(step.violations).length || cumulative<previousTravel || metres<previousDistance) invalid();
      close(arrival,previousDeparture+cumulative-previousTravel);
      if(index===0) {
        if(step.type!=='start' || arrival!==0 || cumulative!==0 || metres!==0 || dwell!==0 || wait!==0 || !same(point,input.origin.coordinates)) invalid();
      } else if(index===steps.length-1) {
        if(step.type!=='end' || dwell!==0 || wait!==0) invalid();
        const end=input.endpoint.kind==='last-customer'?visits.at(-1)?.coordinates:input.endpoint.coordinates;
        if(!end || !same(point,end)) invalid();
      } else {
        if(step.type!=='job') invalid();
        const task=resolve(step.id);
        if(!same(point,task.coordinates) || dwell!==(task.serviceEstimateSeconds??DEFAULT_CUSTOMER_SERVICE_SECONDS)) invalid();
        visits.push({taskId:task.taskId,coordinates:point,arrivalOffsetSeconds:arrival,travelDurationSeconds:cumulative,distanceMetres:metres,serviceEstimateSeconds:dwell,waitingSeconds:wait});
        service+=dwell;waiting+=wait;
      }
      previousDeparture=arrival+dwell+wait;previousTravel=cumulative;previousDistance=metres;
    }
    travel=number(route.duration);distance=number(route.distance);finish=previousDeparture;
    close(travel,previousTravel);close(distance,previousDistance);close(number(route.service),service);close(number(route.waiting_time),waiting);
    close(finish,travel+service+waiting);
  }
  if(seen.size!==ids.size) invalid();
  close(number(summary.duration),travel);close(number(summary.distance),distance);close(number(summary.service),service);close(number(summary.waiting_time),waiting);close(number(summary.setup),0);
  const branchService=input.endpoint.kind==='branch' && visits.length ? input.endpoint.serviceEstimateSeconds : 0;
  const result:OptimizationResult={mode:input.mode,status:unassignedTaskIds.length?'partial':'complete',policyValidated:false,visits,unassignedTaskIds,travelDurationSeconds:travel,distanceMetres:distance,customerServiceEstimateSeconds:service,branchServiceEstimateSeconds:branchService,waitingSeconds:waiting,finishOffsetSeconds:finish+branchService,endpoint:input.endpoint};
  validateModel('OptimizationResult',result,true);return result;
}
