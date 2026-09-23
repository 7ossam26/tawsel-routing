import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { Pool } from 'pg';
import type { components } from '@tawsel/api-client';
import { withAccess, AccessDenied, LifecycleDenied, type AuthenticatedPrincipal, type ResourcePolicy, type ResourceScope, type AccessSession } from '../access/service.js';
import { executeCommandInTransaction, type ActionEnvelope } from '../commands/kernel.js';
import { lockInvariants } from '../commands/locks.js';
import type { Transaction } from '../db/transaction.js';
import { Nominatim, LocationError } from './geocoder.js';
import { enqueuePlanning } from '../planning/queue.js';

type Snapshot=components['schemas']['LocationExecutionSnapshot'];
type Confirm=components['schemas']['LocationConfirm'];
type Pin=components['schemas']['LocationPin'];
interface Row extends ResourceScope {task_id:string;source_revision:string;departure_at:Date|null;recipient_name:string;kind:'personal'|'company';original:Snapshot['original'];dispatch_cycle_id:string|null;state:string|null;earliest_at:Date|null;location_revision:string|null;pin_source_revision:string|null;latitude:number|null;longitude:number|null;provenance:Pin['provenance']|null;confirmed_by:string|null;confirmed_at:Date|null;planning_revision:string|null;planning_job_status:Snapshot['planningStatus']|null}
const editPolicy: ResourcePolicy=[{capability:'location.review',ownership:'assigned-branches'},{capability:'execution.own',ownership:'own-driver'},{capability:'correction.own',ownership:'own-driver'}];
const readPolicy: ResourcePolicy=[...editPolicy,{capability:'monitor.read',ownership:'assigned-branches'}];
const select=`SELECT t.*,l.revision AS location_revision,l.source_revision AS pin_source_revision,l.latitude,l.longitude,l.provenance,l.confirmed_by,l.confirmed_at,p.revision AS planning_revision,
 (SELECT j.status FROM tawsel.planning_states ps JOIN tawsel.planning_jobs j ON j.tenant_id=ps.tenant_id AND j.job_id=ps.latest_job_id WHERE ps.tenant_id=t.tenant_id AND ps.driver_id=t.driver_id) AS planning_job_status
 FROM tawsel.location_tasks t LEFT JOIN tawsel.task_locations l USING(tenant_id,task_id)
 LEFT JOIN tawsel.location_planning_inputs p ON p.tenant_id=t.tenant_id AND p.driver_id=t.driver_id`;
const ajv=new Ajv2020({strict:true}); (addFormats as unknown as (a:Ajv2020)=>void)(ajv);
for(const file of ['common.schema.json','b2c-intake.schema.json','action-envelope.v1.schema.json','evidence-receipt.v1.schema.json','action-result.v1.schema.json','location.schema.json'])ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${file}`,import.meta.url),'utf8')));
export const locationConforms=(name:string,value:unknown)=>ajv.validate(`https://schemas.tawsel.invalid/v1/location.schema.json#/$defs/${name}`,value);
function taskId(id:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new LocationError('validation_failed',400,'معرّف المهمة غير صالح.');}
function human(a:AccessSession){if(a.context.principalKind!=='account')throw new AccessDenied();}
function editable(a:AccessSession,r:Row){return a.canRead(editPolicy,r)&&(!r.departure_at || (r.driver_id===a.context.driverId&&a.canRead([{capability:'correction.own',ownership:'own-driver'}],r)));}
function view(a:AccessSession,r:Row):Snapshot {
 const current=r.location_revision && r.pin_source_revision===r.source_revision;
 const pin:Pin|null=current?{coordinates:{latitude:r.latitude!,longitude:r.longitude!},provenance:r.provenance!,confirmedBy:r.confirmed_by,confirmedAt:r.confirmed_at!.toISOString(),sourceRevision:Number(r.source_revision)}
 :!r.location_revision&&r.original.kind==='confirmed-pin'?{coordinates:r.original.coordinates,provenance:{kind:'source-confirmed'},confirmedBy:null,confirmedAt:null,sourceRevision:Number(r.source_revision)}:null;
 return {taskId:r.task_id,recipientName:r.recipient_name??'',original:r.original,sourceRevision:Number(r.source_revision),locationRevision:Number(r.location_revision??0),pin,locationReadiness:pin?'confirmed':'needs-resolution',editable:editable(a,r),planningInputRevision:Number(r.planning_revision??0),planningStatus:r.planning_job_status??(r.planning_revision?'pending':'not-requested')};
}
async function load(tx:Transaction,tenant:string,id:string){return (await tx.query<Row>(`${select} WHERE t.tenant_id=$1 AND t.task_id=$2`,[tenant,id])).rows[0];}
const scope=(a:AccessSession,r:Row)=>`${a.context.tenantId}/${a.context.sourceId}/${r.task_id}/${r.source_revision}`;
export class Locations {
 constructor(readonly pool:Pool,readonly geocoder=new Nominatim()){}
 async get(principal:AuthenticatedPrincipal,id:string){taskId(id);return withAccess(this.pool,principal,async(a,tx)=>{human(a);return view(a,a.requireResource(readPolicy,await load(tx,a.context.tenantId,id)));});}
 async list(principal:AuthenticatedPrincipal){return withAccess(this.pool,principal,async(a,tx)=>{human(a);const p=a.sqlPredicate(readPolicy,'t');const rows=await tx.query<Row>(`${select} WHERE ${p.text} ORDER BY t.task_id LIMIT 50`,p.values);return {items:rows.rows.map(r=>view(a,r))};});}
 async search(principal:AuthenticatedPrincipal,id:string,input:unknown){taskId(id);if(!locationConforms('Search',input))throw new LocationError('validation_failed',400,'اكتب عنوانًا صالحًا.');
   const key=await withAccess(this.pool,principal,async(a,tx)=>{human(a);const r=a.requireResource(editPolicy,await load(tx,a.context.tenantId,id));if(!editable(a,r))throw new LifecycleDenied();return scope(a,r);});
   const items=await this.geocoder.search(key,(input as {query:string}).query);
   // Revalidate visibility after external I/O; do not hold a transaction for geocoding.
   await this.get(principal,id);return {items,attribution:'© OpenStreetMap contributors, ODbL'};
 }
 async confirm(principal:AuthenticatedPrincipal,envelope:ActionEnvelope){
  if(!locationConforms('ConfirmCommand',envelope))throw new LocationError('validation_failed',400,'راجع الإحداثيات وتأكيد الموقع.');
  const p=envelope.payload as unknown as Confirm;
  if(envelope.resources.taskId!==p.taskId)throw new LocationError('validation_failed',400,'معرّف المهمة غير متطابق.');
  return withAccess(this.pool,principal,async(a,tx)=>{
   human(a);if(envelope.context.kind!=='device')throw new AccessDenied();a.assertScope({tenantId:envelope.context.tenantId,accountId:envelope.context.accountId});
   return executeCommandInTransaction(tx,a.commandScope,envelope,{
    async authorize(){a.requireResource(editPolicy,await load(tx,a.context.tenantId,p.taskId));},
    writeDomain:async(tx,command)=>{
     const before=a.requireResource(editPolicy,await load(tx,a.context.tenantId,p.taskId));
     await lockInvariants(tx,a.context.tenantId,[...(before.driver_id?[{kind:'driver' as const,id:before.driver_id}]:[]),{kind:'task',id:p.taskId}]);
     const r=a.requireResource(editPolicy,await load(tx,a.context.tenantId,p.taskId));
     if(r.driver_id!==before.driver_id)throw new LocationError('stale_revision',409,'تغيّر المندوب؛ أعد تحميل المهمة.');
     if(!editable(a,r))throw new LifecycleDenied();
     if(Number(r.source_revision)!==p.expectedSourceRevision||Number(r.location_revision??0)!==p.expectedLocationRevision)throw new LocationError('stale_revision',409,'تغيّر العنوان أو الموقع؛ راجع النسخة الحالية.');
     const candidate=p.selection.kind==='candidate'?this.geocoder.candidate(scope(a,r),p.selection.candidateId):undefined;
     const coordinates=candidate?.coordinates??(p.selection as {coordinates:Pin['coordinates']}).coordinates;
     const provenance:Pin['provenance']=candidate?{kind:'nominatim',candidate}:{kind:'manual'};
     const revision=p.expectedLocationRevision+1;
     await tx.query(`INSERT INTO tawsel.task_locations (tenant_id,task_id,b2c_task_id,b2b_task_id,revision,source_revision,latitude,longitude,provenance,confirmed_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(tenant_id,task_id) DO UPDATE SET revision=$5,source_revision=$6,latitude=$7,longitude=$8,provenance=$9,confirmed_by=$10,confirmed_at=clock_timestamp()`,
     [r.tenant_id,r.task_id,r.kind==='personal'?r.task_id:null,r.kind==='company'?r.task_id:null,revision,r.source_revision,coordinates.latitude,coordinates.longitude,provenance,a.context.sourceId]);
     if(r.driver_id){
      const resolved=(await tx.query('SELECT 1 FROM tawsel.effective_task_outcomes WHERE tenant_id=$1 AND task_id=$2',[r.tenant_id,r.task_id])).rowCount;
      if(!resolved&&r.state==='held'&&(!r.earliest_at||r.earliest_at<=new Date())){
       await tx.query(`INSERT INTO tawsel.driver_planned_stops (tenant_id,driver_id,stop_id,kind,dispatch_cycle_id,state) VALUES ($1,$2,$3,'customer',$3,'remaining') ON CONFLICT(tenant_id,dispatch_cycle_id) DO UPDATE SET driver_id=$2,state='remaining'`,[r.tenant_id,r.driver_id,r.dispatch_cycle_id]);
       const count=await tx.query(`SELECT count(*)::int AS n FROM tawsel.driver_planned_stops WHERE tenant_id=$1 AND driver_id=$2 AND state='remaining'`,[r.tenant_id,r.driver_id]);
       if(count.rows[0].n>50)throw new LocationError('capacity_exceeded',409,'خط السير ممتلئ؛ لم يُحفظ هذا التعديل.');
      }
      await tx.query(`INSERT INTO tawsel.location_planning_inputs (tenant_id,driver_id,revision) VALUES ($1,$2,1) ON CONFLICT(tenant_id,driver_id) DO UPDATE SET revision=location_planning_inputs.revision+1`,[r.tenant_id,r.driver_id]);
      await enqueuePlanning(tx,r.tenant_id,r.driver_id,a.context.sourceId,command.actionId);
     }
     const location=view(a,(await load(tx,r.tenant_id,r.task_id))!);
     await tx.query(`INSERT INTO tawsel.location_history VALUES ($1,$2,$3,$4,$5,$6)`,[r.tenant_id,r.task_id,revision,location,a.context.sourceId,command.actionId]);
     return {status:'accepted',response:{status:200,body:{location}},summary:{taskId:r.task_id,locationRevision:revision},audit:{taskId:r.task_id,locationRevision:revision,provenance},resourceVersions:{sourceRevision:Number(r.source_revision),locationRevision:revision,...(location.planningInputRevision?{planningInputRevision:location.planningInputRevision}:{})},intents:r.integration_id?[{eventId:randomUUID(),recipientId:r.integration_id,eventType:'location.pinConfirmed',payloadVersion:'1.0.0',payload:{actionId:command.actionId,location}}]:[]};
    },async writeProgress(){}
   });
  });
 }
}
