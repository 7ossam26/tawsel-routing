import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { MapPin,RefreshCw } from 'lucide-react';
import type { components } from '@tawsel/api-client';
import { CurrentClient } from '@tawsel/api-client/src/current';
import { RoundsClient } from '@tawsel/api-client/src/rounds';
import { ActionButton,ContactActions,StatusNotice,StopIdentity } from './components/ui';
import { api,deviceId,nextSequence } from './independent-tasks';
type Snapshot=components['schemas']['CurrentSnapshot'];
type Command=components['schemas']['CurrentSelectHeadingCommand']|components['schemas']['CurrentArrivalCommand'];
type Context=components['schemas']['SessionContext'];

export function CurrentActivityPage(){
 const kind=new URLSearchParams(window.location.search).get('kind')==='company'?'company':'personal';
 const client=useMemo(()=>new CurrentClient(kind),[kind]);
 const [context,setContext]=useState<Context|null>(null),[state,setState]=useState<Snapshot|null>(null),[selected,setSelected]=useState('');
 const [busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState<Command|null>(null);
 const pendingKey=useRef(''),inFlight=useRef(false),headingRef=useRef<HTMLHeadingElement>(null);
 const clearPending=()=>{if(pendingKey.current)sessionStorage.removeItem(pendingKey.current);setPending(null);};
 const refresh=useCallback(async()=>{
  const session=await api(`/api/session/context?kind=${kind}`) as Context;setContext(session);
  const round=(await new RoundsClient(kind).current()).round;
  if(!round){setState(null);setLoaded(true);return;}
  pendingKey.current=`tawsel:current-pending:${session.access.tenantId}:${session.access.sourceId}:${round.roundId}:${deviceId()}`;
  const saved=sessionStorage.getItem(pendingKey.current);
  if(saved){const c=JSON.parse(saved) as Command;setPending(c);const result=await client.result(c.actionId);if(result.status!=='pending'){sessionStorage.removeItem(pendingKey.current);setPending(null);if(result.result?.receipt.businessStatus!=='accepted')setError(result.result?.receipt.problem?.detail??'لم يُقبل الإجراء.');}}
  const next=await client.read(round.roundId);setState(next);setSelected(next.currentActivity?.taskId??next.nextSuggestion?.taskId??next.targets[0]?.taskId??'');setLoaded(true);
 },[client,kind]);
 useEffect(()=>{void refresh().catch(e=>{setError(e instanceof Error?e.message:'تعذر تحميل الجولة.');setLoaded(true);});},[refresh]);
 const send=async(c:Command)=>{
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
  let accepted=false;
  try{
   // One uncertain online request, retained through reload. P33 owns the full
   // offline queue; this screen never claims unaccepted work is authoritative.
   sessionStorage.setItem(pendingKey.current,JSON.stringify(c));setPending(c);
   const result=c.operationId==='current.selectHeading'?await client.heading(c):await client.arrival(c);
   accepted=result.receipt.businessStatus==='accepted';
   clearPending();if(!accepted)setError(result.receipt.problem?.detail??'لم يُقبل الإجراء.');
   else if(result.response){const body=result.response.body as components['schemas']['CurrentCommandResult'];setState(s=>s?{...s,revision:body.revision,currentActivity:body.currentActivity,physicalOrigin:body.physicalOrigin,planningOrigin:body.physicalOrigin?{kind:body.physicalOrigin.kind,coordinates:body.physicalOrigin.coordinates}:s.planningOrigin,planning:{...s.planning,updating:true}}:s);}
   await refresh();headingRef.current?.focus();
  }catch{setError(accepted?'تم حفظ الإجراء، وتعذّر تحديث العرض. حدّث الجولة.':'لم يتأكد حفظ الإجراء. أعد التحقق بنفس الطلب عند عودة الاتصال.');}
  finally{inFlight.current=false;setBusy(false);}
 };
 const target=state?.targets.find(t=>t.taskId===selected),current=state?.currentActivity;
 const same=current?.taskId===target?.taskId,owner=Boolean(state&&state.owner.accountId===context?.access.sourceId&&state.owner.deviceId===deviceId());
 const act=()=>{
  if(!state||!context||!target||pending)return;
  const arrival=same&&current?.stage==='heading';
  const c={schemaVersion:'1.0.0',payloadVersion:'1.0.0',actionId:crypto.randomUUID(),operationId:arrival?'current.recordArrival':'current.selectHeading',context:{kind:'device',tenantId:context.access.tenantId,accountId:context.access.sourceId,deviceId:deviceId(),deviceGeneration:state.owner.generation,deviceSequence:nextSequence()},resources:{tripId:state.roundId,taskId:target.taskId,attemptId:target.attemptId},baseVersions:{},dependsOnActionIds:[],observation:{observedAt:new Date().toISOString(),clock:{quality:'uncertain'}},payload:{roundId:state.roundId,taskId:target.taskId,attemptId:target.attemptId,expectedActivityRevision:state.revision,expectedCurrentAttemptId:current?.attemptId??null,expectedSourceRevision:target.sourceRevision,expectedAssignmentRevision:target.assignmentRevision,expectedPinRevision:target.pinRevision}} as Command;
  void send(c);
 };
 return <main className="tasks-shell current-shell" dir="rtl"><header className="tasks-header"><div><p className="eyebrow">توصيل · جولتك</p><h1 ref={headingRef} tabIndex={-1}>المحطة الحالية</h1><p>{current?.stage==='arrived'?'تم تسجيل وصولك؛ نتيجة التسليم لم تُسجّل.':current?'أكّد الوصول عندما تصل للعميل.':'اختر العميل ثم أكّد الاتجاه إليه.'}</p></div><MapPin aria-hidden="true" /></header>
  {error?<StatusNotice tone="error" title="تحتاج الجولة مراجعة" live>{error}</StatusNotice>:null}
  {pending?<StatusNotice tone="waiting" title="إجراء ينتظر التأكيد" live><ActionButton busy={busy} onClick={()=>void send(pending)}>التحقق وإعادة المحاولة</ActionButton></StatusNotice>:null}
  {!loaded?<StatusNotice title="جارٍ تحميل الجولة"/>:!state?(!error?<StatusNotice title="لا توجد جولة نشطة">ابدأ جولة متزامنة أولًا من تجهيز العمل.</StatusNotice>:null):<>
   {!owner?<StatusNotice tone="waiting" title="الجولة تعمل على جهاز آخر">يمكنك متابعة حالتها هنا؛ استخدم الجهاز المالك لتسجيل الحركة.</StatusNotice>:null}
   {target?<section className="current-stage-card" aria-label="تفاصيل المحطة"><StopIdentity recipientName={target.recipientName} phone={target.recipientPhone} address={target.address??'نقطة التوصيل مؤكّدة على الخريطة'} stageLabel={same?(current?.stage==='arrived'?'وصلت للعميل':'متجه للعميل'):'عميل مختار — لم يبدأ الاتجاه إليه'}/><ContactActions phone={target.recipientPhone} coordinates={target.coordinates}/>
    {current?.stage!=='arrived'?<ActionButton onClick={act} busy={busy} disabled={!owner||Boolean(pending)}>{same?'وصلت':'اتجه للعميل'}</ActionButton>:<StatusNotice tone="success" title="الوصول مسجّل" live>وقت تسجيل الوصول: <bdi>{new Date(current.arrival!.recordedAt).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Cairo'})}</bdi></StatusNotice>}
   </section>:<StatusNotice title="لا توجد محطة متاحة الآن">حدّث الجولة للتحقق من العمل المتاح.</StatusNotice>}
   {!current?<div className="field"><label htmlFor="current-choice">اختيار العميل</label><select id="current-choice" value={selected} disabled={busy||Boolean(pending)||!owner} onChange={e=>setSelected(e.target.value)}>{state.targets.map(t=><option key={t.taskId} value={t.taskId}>{t.recipientName}</option>)}</select></div>:current.stage==='heading'&&owner?<details className="current-secondary"><summary>تغيير العميل المتجه إليه</summary><p>لن يتغيّر الاتجاه المسجّل إلا بعد الضغط على «اتجه للعميل».</p><label htmlFor="current-choice">اختيار العميل</label><select id="current-choice" value={selected} disabled={busy||Boolean(pending)} onChange={e=>setSelected(e.target.value)}>{state.targets.map(t=><option key={t.taskId} value={t.taskId}>{t.recipientName}</option>)}</select></details>:null}
   <aside className="current-next" aria-label="الاقتراح التالي"><span className="eyebrow">التالي المقترح</span><p>{state.nextSuggestion?.recipientName??'لا يوجد اقتراح آخر حاليًا'}</p><small>{state.planning.updating?'الترتيب قيد التحديث؛ المحطة الحالية محفوظة.':'اقتراح للترتيب؛ لم يبدأ الاتجاه إليه.'}</small></aside>
   <details className="current-secondary"><summary>نقطة الانطلاق المستخدمة</summary><p>{state.physicalOrigin?.kind==='last-confirmed-stop'?'آخر وصول سجّلته':state.physicalOrigin?'نقطة حدّدتها يدويًا':'نقطة تجهيز الجولة'}</p><bdi dir="ltr">{state.planningOrigin.coordinates.latitude}, {state.planningOrigin.coordinates.longitude}</bdi></details>
  </>}
  <ActionButton variant="quiet" disabled={busy} onClick={()=>{setError('');void refresh().catch(()=>setError('تعذر تحديث الجولة؛ الحالة المعروضة هي آخر ما تم تحميله.'));}}><RefreshCw aria-hidden="true"/>تحديث الجولة</ActionButton>
 </main>;
}
