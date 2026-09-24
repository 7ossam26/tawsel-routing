import React,{useState,useEffect,useCallback,type FormEvent} from 'react';
import {createRoot} from 'react-dom/client';
import type {components} from '@tawsel/api-client';
import {ActionButton,Field,StatusNotice,FilterTabs} from '../../web/src/components/ui';
import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-600.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/cairo/arabic-800.css';
import '@fontsource/cairo/latin-400.css';
import '@fontsource/cairo/latin-600.css';
import '@fontsource/cairo/latin-700.css';
import '@fontsource/cairo/latin-800.css';
import '../../web/src/styles.css';
import './style.css';
type S=components['schemas'];
type RecordRow={kind:string;external_id:string;revision:number;desired:Record<string,unknown>;status:string;result:S['ActionResult']|null;last_error:string|null};
type CommandRow={action_id:string;envelope:{operationId:string};status:string;last_error:string|null;attempts:number};
type State={records:RecordRow[];commands:CommandRow[]};
type Submit=(op:string,payload:Record<string,unknown>,keys:string[])=>Promise<void>;
const statusText:Record<string,string>={pending:'محفوظ — بانتظار توصيل',accepted:'قبله توصيل',rejected:'رفضه توصيل', 'review-required':'يحتاج مراجعة',unassigned:'غير مسندة',prepared:'مجهزة — ليست مع المندوب',held:'استلام مؤكد من المصدر',withdrawn:'أزيلت قبل المغادرة'};
const errorText:Record<string,string>={invalid_source_command:'راجع الحقول والقيم؛ لم يُحفظ طلب جديد.',invalid_source_form:'بيانات الطلب غير مكتملة؛ راجع الحقول.',source_identity_conflict:'معرف الطلب يتعارض مع طلب محفوظ. حدّث البيانات وراجع التعديل.',capacity_exceeded:'الدفعة تتجاوز الحد المتاح. لم يقبل توصيل أي شحنة منها.',departed_edit_forbidden:'غادرت الشحنة؛ تعديل الموظف غير مسموح.',lifecycle_forbidden:'الشحنة غادرت أو تغيرت حالتها؛ التعديل غير مسموح.',source_revision_conflict:'تغيرت البيانات. حدّث الصفحة وراجع الطلب.',stale_revision:'تغيرت حالة الشحنة. حدّث البيانات قبل إعادة الطلب.',native_login_required:'سجّل الدخول من جديد. الطلبات المحفوظة باقية.',native_access_denied:'هذا الحساب غير مخول بإدارة النموذج.',native_csrf_denied:'حدّث الصفحة ثم أعد المحاولة.'};
async function api<T>(path:string,body?:unknown,csrf?:string):Promise<T>{const response=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'content-type':'application/json','x-csrf-token':csrf??''},...(body===undefined?{}:{body:JSON.stringify(body)})}).catch(()=>{throw new Error('تعذر الاتصال. لم تتأكد النتيجة؛ حاول لاحقًا.');});const value=await response.json();if(!response.ok)throw Object.assign(new Error(errorText[value.code as string]??'تعذر تأكيد الطلب. البيانات المحفوظة باقية؛ حاول لاحقًا.'),{status:response.status});return value as T;}
function Select({label,value,onChange,items}:{label:string;value:string;onChange:(s:string)=>void;items:{value:string;label:string}[]}){return <label className="native-select">{label}<select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}><option value="">اختر</option>{items.map(i=><option key={i.value} value={i.value}>{i.label}</option>)}</select></label>;}
const options=(rows:RecordRow[],kind:string)=>rows.filter(r=>r.kind===kind&&r.status==='accepted').map(r=>({value:r.external_id,label:String(r.desired.name??r.external_id)}));
const resource=(r:RecordRow)=>String(r.result?.response?.body.resourceId??'');
function App(){
 const [session,setSession]=useState<{subject:string;csrf:string}|null>(null),[state,setState]=useState<State>({records:[],commands:[]}),[tab,setTab]=useState('tasks'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [noticeAction,setNoticeAction]=useState('');
 const latestNotice=state.commands.find(c=>c.action_id===noticeAction);
 const refresh=useCallback(async()=>setState(await api<State>('/native/state')),[]);
 useEffect(()=>{void api<{subject:string;csrf:string}>('/native/session').then(s=>{setSession(s);return refresh();}).catch(()=>{});},[refresh]);
 useEffect(()=>{if(!session)return;let cancelled=false;let timer:ReturnType<typeof setTimeout>;const poll=async()=>{try{if(document.visibilityState==='visible')await refresh();}catch{/* keep last known state */}if(!cancelled)timer=setTimeout(()=>void poll(),2000);};timer=setTimeout(()=>void poll(),2000);return()=>{cancelled=true;clearTimeout(timer);};},[session,refresh]);
 const submit:Submit=async(op,payload,keys)=>{
  if(!session)return;setBusy(true);setError('');setNotice('');setNoticeAction('');const key=`mock-erp-pending/${session.subject}`;
  try{
   const previous=sessionStorage.getItem(key);if(previous)throw new Error('طلب سابق لم يتأكد حفظه. استخدم «استعادة الطلب المحفوظ» أولًا.');
   const body={actionId:crypto.randomUUID(),operationId:op,payload,expectedRevisions:Object.fromEntries(keys.map(k=>{const separator=k.indexOf('/'),kind=k.slice(0,separator),id=k.slice(separator+1);return [k,state.records.find(r=>r.kind===kind&&r.external_id===id)?.revision??0];}))};
   sessionStorage.setItem(key,JSON.stringify(body));
   await api('/native/commands',body,session.csrf);sessionStorage.removeItem(key);setNoticeAction(body.actionId);await refresh();setNotice('حُفظ الطلب في ERP. انتظر نتيجة توصيل في سجل الطلبات.');
  }catch(e){if([400,409].includes((e as {status:number}).status))sessionStorage.removeItem(key);setError((e as Error).message);throw e;}finally{setBusy(false);}
 };
 const recover=async()=>{if(!session)return;const key=`mock-erp-pending/${session.subject}`,value=sessionStorage.getItem(key);if(!value)return;setBusy(true);try{const body=JSON.parse(value) as {actionId:string};await api('/native/commands',body,session.csrf);sessionStorage.removeItem(key);setError('');setNoticeAction(body.actionId);await refresh();setNotice('تأكد حفظ الطلب الأصلي.');}catch(e){if([400,409].includes((e as {status:number}).status))sessionStorage.removeItem(key);setError((e as Error).message);}finally{setBusy(false);}};
 return <><header className="native-header"><strong>توصيل <span>ERP تجريبي خاص</span></strong><span>بيانات اختبار فقط · ليس نظام مخزون أو حسابات</span></header><main className="native-shell">
 {!session?<section className="native-card"><h1>إدارة المصدر التجريبي</h1><p>سجّل بحساب موظف مخول. جلسة هذا النموذج مستقلة عن جلسة المندوب.</p><a className="action-button action-button--primary" href="/login">دخول موظف ERP</a></section>:<>
 <div className="native-title"><div><h1>مصدر الشحنات</h1><p>احفظ طلبك هنا، ثم تابع قبوله وتحديثات التنفيذ.</p></div><ActionButton variant="quiet" onClick={()=>void api('/native/logout',{},session.csrf).then(()=>location.reload()).catch(e=>setError(e.message))}>خروج</ActionButton></div>
 <FilterTabs label="أقسام ERP" active={tab} onChange={setTab} items={[{id:'tasks',label:'الشحنات'},{id:'returns',label:'مرتجعات المندوب'},{id:'admin',label:'المستخدمون والفروع'},{id:'status',label:'حالة التكامل'}]}/>
 {error&&<StatusNotice tone="error" title={error}/>} {notice&&<StatusNotice live tone={latestNotice?.status==='accepted'?'success':latestNotice?.status==='rejected'?'error':'waiting'} title={latestNotice&&latestNotice.status!=='pending'?`${statusText[latestNotice.status]}.${latestNotice.last_error?' '+(errorText[latestNotice.last_error]??'راجع تفاصيل الطلب.'):''}`:notice}/>}
 {sessionStorage.getItem(`mock-erp-pending/${session.subject}`)&&<ActionButton variant="secondary" busy={busy} onClick={()=>void recover()}>استعادة الطلب المحفوظ</ActionButton>}
 <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}><fieldset disabled={busy} className="native-fieldset">
 {tab==='admin'?<Administration rows={state.records} submit={submit}/>:tab==='tasks'?<Tasks rows={state.records} submit={submit}/>:tab==='returns'?<Returns rows={state.records} submit={submit}/>:<Integration commands={state.commands}/>}</fieldset></div>
 <section aria-label="آخر طلبات المصدر" className="native-card"><h2>آخر الطلبات</h2>{state.commands.slice(0,6).map(c=><div className="native-command" key={c.action_id}><span>{statusText[c.status]}</span><small>{c.last_error?(errorText[c.last_error]??(c.status==='pending'?'النتيجة لم تتأكد؛ الطلب محفوظ للمحاولة التالية.':'راجع سبب الرفض قبل إرسال تعديل جديد.')):''}</small><details><summary>تفاصيل الطلب</summary><bdi>{c.envelope.operationId} · {c.action_id}{c.last_error?` · ${c.last_error}`:null}</bdi></details></div>)}</section>
 </>}
 </main></>;
}
function Administration({rows,submit}:{rows:RecordRow[];submit:Submit}){
 const [kind,setKind]=useState('branch'),[id,setId]=useState(''),[name,setName]=useState(''),[subject,setSubject]=useState(''),[role,setRole]=useState(''),[branch,setBranch]=useState(''),[cap,setCap]=useState('execution.own'),[effect,setEffect]=useState('inherit'),[issuer,setIssuer]=useState('');
 const entity=kind==='exceptions'?'user':kind,old=rows.find(r=>r.kind===entity&&r.external_id===id),revision=Number(old?.desired.sourceRevision??0)+1;
 const save=async(e:FormEvent)=>{e.preventDefault();let op:string,p:Record<string,unknown>;
  if(kind==='branch'){op='branch.provision';p={externalId:id,sourceRevision:revision,name,enabled:true,location:null};}
  else if(kind==='role'){op='role.defineCapabilities';p={externalId:id,sourceRevision:revision,name,capabilities:[cap]};}
  else if(kind==='user'){op='user.provision';p={externalId:id,sourceRevision:revision,subject,roleExternalId:role,branchExternalIds:[branch],enabled:true};}
  else if(kind==='driver'){op='driver.provisionReference';p={externalId:id,sourceRevision:revision,userExternalId:subject,enabled:true,profile:'car',vehicleReference:null};}
  else {op='user.setCapabilityExceptions';const previous=(old?.desired.exceptions??[]) as {capability:string;effect:string}[];p={externalId:id,sourceRevision:revision,exceptions:[...previous.filter(x=>x.capability!==cap),{capability:cap,effect}]};}
  await submit(op,p,[`${entity}/${id}`]);
 };
 return <section className="native-card"><h2>إدارة المستخدمين والفروع</h2><p>البيانات تذهب إلى التهيئة الموثوقة. اسم الدور وحده لا يمنح صلاحية.</p><Select label="نوع التعديل" value={kind} onChange={setKind} items={[{value:'branch',label:'فرع'},{value:'role',label:'دور وصلاحياته'},{value:'user',label:'مستخدم ودوره وفرعه'},{value:'driver',label:'مرجع مندوب'},{value:'exceptions',label:'استثناء صلاحية مستخدم'}]}/>
 <form onSubmit={e=>void save(e).catch(()=>{})} className="native-form"><Field id="admin-id" label="مرجع المصدر" required value={id} onChange={e=>setId(e.target.value)}/>
 {(kind==='branch'||kind==='role')&&<Field id="admin-name" label="الاسم" required value={name} onChange={e=>setName(e.target.value)}/>}
 {(kind==='user'||kind==='driver')&&<Field id="admin-subject" label={kind==='user'?'معرف المستخدم في جهة الهوية':'مرجع مستخدم ERP'} required value={subject} onChange={e=>setSubject(e.target.value)}/>}
 {kind==='user'&&<><Select label="دور المستخدم" value={role} onChange={setRole} items={options(rows,'role')}/><Select label="فرع المستخدم" value={branch} onChange={setBranch} items={options(rows,'branch')}/></>}
 {(kind==='role'||kind==='exceptions')&&<Select label="الصلاحية" value={cap} onChange={setCap} items={[{value:'execution.own',label:'تنفيذ المندوب'},{value:'monitor.read',label:'عرض المتابعة'},{value:'return.receive',label:'استلام المرتجعات'},{value:'return.dispose',label:'تسجيل الفقد والتلف'},{value:'planning.manage',label:'إدارة التخطيط'}]}/>}
 {kind==='exceptions'&&<Select label="استثناء المستخدم" value={effect} onChange={setEffect} items={[{value:'inherit',label:'وراثة من الدور'},{value:'allow',label:'سماح'},{value:'deny',label:'منع'}]}/>}
 <ActionButton type="submit">حفظ وإرسال التعديل</ActionButton></form>
 {old&&<p>آخر طلب: {statusText[old.status]} · المراجعة المحلية {old.revision}</p>}
 {(kind==='user'||kind==='exceptions')&&<><ActionButton variant="quiet" onClick={()=>void api<S['ProvisioningStatus']>(`/native/provisioning?entity=user&externalId=${encodeURIComponent(id)}`).then(s=>setIssuer(s.issuerStatus==='ready'?(s.enabled?'الحساب جاهز لدى جهة الهوية':'الحساب معطل'):'بانتظار تأكيد جهة الهوية')).catch(e=>setIssuer(e.message))}>فحص جاهزية الحساب</ActionButton><p role="status">{issuer}</p></>}
 </section>;
}
function Tasks({rows,submit}:{rows:RecordRow[];submit:Submit}){
 const [tasks,setTasks]=useState<S['B2bTask'][]>([]),[error,setError]=useState(''),[selected,setSelected]=useState<string[]>([]),[driver,setDriver]=useState(''),[mode,setMode]=useState('prepare'),[asserted,setAsserted]=useState(false),[editing,setEditing]=useState<S['B2bTask']|null|undefined>(undefined);
 const refresh=async()=>{try{const all:S['B2bTask'][]=[];let cursor:string|null=null;do{const page:S['B2bTaskList']=await api<S['B2bTaskList']>(`/native/tasks${cursor?'?cursor='+encodeURIComponent(cursor):''}`);all.push(...page.items);cursor=page.nextCursor??null;}while(cursor);setTasks(all);setError('');}catch(e){setError((e as Error).message);}};
 useEffect(()=>{void refresh();},[]);
 const reference=(t:S['B2bTask'])=>({externalId:t.externalId,sourceDispatchCycleId:t.sourceDispatchCycleId,expectedSourceRevision:t.sourceRevision,expectedAssignmentRevision:t.assignmentRevision,assignmentRevision:t.assignmentRevision+1});
 const assign=async(e:FormEvent)=>{e.preventDefault();const picked=tasks.filter(t=>selected.includes(t.externalId));if(!driver||!picked.length||picked.some(t=>!t.editable))return;
  await submit(mode==='prepare'?'intake.prepare':'assignment.receiveBatch',{driverExternalId:driver,items:picked.map(reference),...(mode==='receive'?{receiptAsserted:asserted}:{})},picked.map(t=>`shipment/${t.externalId}`));setSelected([]);setAsserted(false);
 };
 return <><section className="native-card"><div className="native-title"><h2>تجهيز الشحنات</h2><ActionButton variant="secondary" onClick={()=>setEditing(null)}>شحنة جديدة</ActionButton></div><p>التجهيز لا يعني الاستلام. أكّد الاستلام فقط بعد تسليم الشحنات للمندوب فعلًا.</p>
 {error&&<StatusNotice tone="error" title={error}/>}<ActionButton variant="quiet" onClick={()=>void refresh()}>تحديث حالة توصيل</ActionButton>
 <form onSubmit={e=>void assign(e).catch(()=>{})}><div className="native-list">{tasks.map(t=><article className="native-shipment" key={t.taskId}><label><input type="checkbox" aria-label={`اختيار ${t.externalId}`} disabled={!t.editable} checked={selected.includes(t.externalId)} onChange={e=>setSelected(e.target.checked?[...selected,t.externalId]:selected.filter(id=>id!==t.externalId))}/><strong><bdi>{t.externalId}</bdi></strong> · {statusText[t.state]}</label>
 {!t.editable?<p className="native-denial">غادرت الشحنة؛ تعديل الموظف غير مسموح. استلام المرتجع له إجراء منفصل.</p>:<details><summary>تعديل الشحنة</summary><ActionButton variant="quiet" type="button" onClick={()=>setEditing(t)}>تعديل بيانات المصدر</ActionButton><ActionButton variant="quiet" type="button" onClick={()=>void submit('assignment.withdraw',reference(t),[`shipment/${t.externalId}`]).catch(()=>{})}>إزالة قبل المغادرة</ActionButton></details>}
 </article>)}</div><Select label="المندوب" value={driver} onChange={setDriver} items={options(rows,'driver')}/><Select label="الإجراء" value={mode} onChange={setMode} items={[{value:'prepare',label:'تجهيز فقط'},{value:'receive',label:'إسناد بعد الاستلام الفعلي'}]}/>
 {mode==='receive'&&<label className="native-check"><input type="checkbox" checked={asserted} onChange={e=>setAsserted(e.target.checked)}/>أؤكد استلام المندوب للشحنات المختارة فعلًا</label>}
 <ActionButton type="submit" disabled={!selected.length||!driver||mode==='receive'&&!asserted}>{mode==='prepare'?'إرسال التجهيز':'تأكيد الاستلام والإسناد'}</ActionButton></form></section>
 {editing!==undefined&&<SnapshotForm key={editing?.taskId??'new'} task={editing} rows={rows} submit={submit} close={()=>setEditing(undefined)}/>}
 </>;
}
function SnapshotForm({task,rows,submit,close,previous}:{task:S['B2bTask']|null;rows:RecordRow[];submit:Submit;close:()=>void;previous?:{externalId:string;cycleId:string;sourceRevision:number;quantity:number}}){
 const local=rows.find(r=>r.kind==='shipment'&&r.external_id===(task?.externalId??previous?.externalId));const old=(local?.desired.snapshot??local?.desired??{}) as Partial<S['B2bSourceSnapshot']>;
 const [id,setId]=useState(task?.externalId??previous?.externalId??''),[branch,setBranch]=useState(old.sourceBranchExternalId??''),[name,setName]=useState(old.recipientName??''),[phone,setPhone]=useState(old.recipientPhone??''),[quantity,setQuantity]=useState(String(previous?.quantity??old.lines?.[0]?.quantity??3)),[unit,setUnit]=useState(String(old.lines?.[0]?.unitDue.amountMinor??10000)),[shipping,setShipping]=useState(String(old.shippingDue?.amountMinor??5000)),[latitude,setLatitude]=useState(String(old.destination?.kind==='confirmed-pin'?old.destination.coordinates.latitude:30.04)),[longitude,setLongitude]=useState(String(old.destination?.kind==='confirmed-pin'?old.destination.coordinates.longitude:31.23)),[pin,setPin]=useState(false),[split,setSplit]=useState(old.splittingAllowed??true);
 const save=async(e:FormEvent)=>{e.preventDefault();const sourceRevision=(task?.sourceRevision??previous?.sourceRevision??0)+1;const money=(amountMinor:number)=>({amountMinor,currency:'EGP',exponent:2});
  const snapshot={externalId:id,sourceDispatchCycleId:task?.sourceDispatchCycleId??`cycle-${crypto.randomUUID()}`,sourceRevision,expectedSourceRevision:sourceRevision-1,sourceBranchExternalId:branch,recipientName:name,recipientPhone:phone,destination:{kind:'confirmed-pin',coordinates:{latitude:Number(latitude),longitude:Number(longitude)}},splittingAllowed:split,allocation:'exact-outstanding-per-unit',lines:[{sourceLineId:old.lines?.[0]?.sourceLineId??'pieces',description:'قطع',quantity:Number(quantity),unitDue:money(Number(unit))}],shippingDue:money(Number(shipping)),totalDue:money(Number(quantity)*Number(unit)+Number(shipping)),priority:'ordinary'};
  await submit(previous?'dispatch.createFromReceipt':'intake.submitSnapshot',previous?{externalId:id,previousDispatchCycleId:previous.cycleId,snapshot}:snapshot,[`shipment/${id}`]);close();
 };
 return <section className="native-card"><h2>{previous?'دورة إرسال جديدة من القطع المستلمة':task?'تعديل بيانات المصدر':'شحنة اختبار جديدة'}</h2><p>نموذج صغير لسطر قطع واحد. المبالغ بالقروش، والموقع يُؤكَّد يدويًا.</p><form className="native-form" onSubmit={e=>void save(e).catch(()=>{})}>
 <Field id="shipment-id" label="مرجع الشحنة" required readOnly={!!task||!!previous} value={id} onChange={e=>setId(e.target.value)}/><Select label="فرع الإرسال" value={branch} onChange={setBranch} items={options(rows,'branch')}/>
 <Field id="recipient" label="اسم المستلم" required value={name} onChange={e=>setName(e.target.value)}/><Field id="phone" label="الهاتف" required value={phone} onChange={e=>setPhone(e.target.value)}/>
 <Field id="quantity" label="عدد القطع" type="number" min={1} max={previous?.quantity??1000000} step={1} required value={quantity} onChange={e=>setQuantity(e.target.value)}/><Field id="unit" label="المستحق لكل قطعة — قرش" type="number" min={0} step={1} required value={unit} onChange={e=>setUnit(e.target.value)}/><Field id="shipping" label="الشحن المستحق — قرش" type="number" min={0} step={1} required value={shipping} onChange={e=>setShipping(e.target.value)}/>
 <Field id="latitude" label="خط العرض" type="number" min={-90} max={90} step="any" required value={latitude} onChange={e=>{setLatitude(e.target.value);setPin(false);}}/><Field id="longitude" label="خط الطول" type="number" min={-180} max={180} step="any" required value={longitude} onChange={e=>{setLongitude(e.target.value);setPin(false);}}/>
 <label className="native-check"><input type="checkbox" checked={pin} onChange={e=>setPin(e.target.checked)}/>راجعت نقطة التسليم وأؤكدها</label><label className="native-check"><input type="checkbox" checked={split} onChange={e=>setSplit(e.target.checked)}/>المصدر يسمح بتسليم جزئي</label>
 <ActionButton disabled={!pin||!branch} type="submit">حفظ وإرسال الشحنة</ActionButton><ActionButton variant="quiet" type="button" onClick={close}>إلغاء</ActionButton></form></section>;
}
function Returns({rows,submit}:{rows:RecordRow[];submit:Submit}){
 const [driver,setDriver]=useState(''),[branch,setBranch]=useState(''),[requests,setRequests]=useState<S['ReturnRequestView'][]>([]),[error,setError]=useState(''),[loaded,setLoaded]=useState(false),[redispatch,setRedispatch]=useState<S['ReturnItem']|null>(null);
 const load=async()=>{setLoaded(false);try{const all:S['ReturnRequestView'][]=[];let cursor:string|null=null;do{const page:S['ReturnRequestList']=await api<S['ReturnRequestList']>(`/native/pending?${new URLSearchParams({driverId:driver,branchId:branch,...(cursor?{cursor}:{})})}`);all.push(...page.items);cursor=page.nextCursor??null;}while(cursor);for(const r of rows.filter(r=>r.kind==='return'&&r.status==='accepted'&&!all.some(a=>a.requestId===r.external_id))){const history=await api<S['ReturnRequestView']>('/native/return?requestId='+encodeURIComponent(r.external_id));if(history.driverId===driver&&history.sourceBranchId===branch)all.push(history);}setRequests(all);setError('');setLoaded(true);}catch(e){setError((e as Error).message);}};
 const choices=(kind:string)=>rows.filter(r=>r.kind===kind&&r.status==='accepted'&&resource(r)).map(r=>({value:resource(r),label:String(r.desired.name??r.external_id)}));
 return <section className="native-card"><h2>مرتجعات المندوب</h2><p>اختر المندوب والفرع. سجّل القطع التي وصلت فعلًا، واترك الباقي معلقًا.</p><Select label="مندوب المرتجعات" value={driver} onChange={s=>{setDriver(s);setRequests([]);setLoaded(false);}} items={choices('driver')}/><Select label="فرع الاستلام الأصلي" value={branch} onChange={s=>{setBranch(s);setRequests([]);setLoaded(false);}} items={choices('branch')}/><ActionButton variant={loaded?'secondary':'primary'} disabled={!driver||!branch} onClick={()=>void load()}>عرض وتحديث المرتجعات</ActionButton>{error&&<StatusNotice tone="error" title={error}/>}{loaded&&!requests.length&&<p>لا توجد عروض معلقة لهذا المندوب والفرع.</p>}
 {requests.map(r=><Receipt key={r.requestId} request={r} submit={submit} redispatch={setRedispatch}/>)}
 {redispatch&&<SnapshotForm task={null} rows={rows} submit={submit} close={()=>setRedispatch(null)} previous={{externalId:redispatch.externalId,cycleId:redispatch.dispatchCycleId,sourceRevision:redispatch.sourceRevision,quantity:redispatch.received}}/>}
 </section>;
}
function Receipt({request,submit,redispatch}:{request:S['ReturnRequestView'];submit:Submit;redispatch:(i:S['ReturnItem'])=>void}){
 const [counts,setCounts]=useState<Record<string,string>>({}),[mode,setMode]=useState('received'),[confirm,setConfirm]=useState(false);
 const items=request.items.filter(i=>Number(counts[i.itemId])>0).map(i=>({itemId:i.itemId,quantity:Number(counts[i.itemId]),expectedRevision:i.revision}));
 const save=async(e:FormEvent)=>{e.preventDefault();await submit(mode==='received'?'return.confirmSubsetReceipt':'return.recordDisposition',{requestId:request.requestId,receivingBranchId:request.sourceBranchId,items,...(mode==='received'?{}:{disposition:mode})},[`return/${request.requestId}`]);setCounts({});setConfirm(false);};
 return <form className="native-return" onSubmit={e=>void save(e).catch(()=>{})}><h3>عرض مرتجع</h3>{request.items.map(i=><div key={i.itemId} className="native-shipment"><strong><bdi>{i.externalId}</bdi></strong><p>مستلم: {i.received} · معلق: {i.unresolved} · مفقود: {i.lost} · تالف: {i.damaged}</p><Field id={`count-${i.itemId}`} label={`القطع الآن — ${i.externalId}`} type="number" min={0} max={i.unresolved} step={1} disabled={i.eligibility!=='pending'} value={counts[i.itemId]??'0'} onChange={e=>setCounts({...counts,[i.itemId]:e.target.value})}/>{i.received>0&&<ActionButton variant="quiet" type="button" onClick={()=>redispatch(i)}>إرسال القطع المستلمة في دورة جديدة</ActionButton>}</div>)}
 <Select label="نوع التأكيد" value={mode} onChange={s=>{setMode(s);setConfirm(false);}} items={[{value:'received',label:'استلام فعلي في الفرع'},{value:'lost',label:'فقد — لا يعتبر استلامًا'},{value:'damaged',label:'تلف — لا يعتبر استلامًا'}]}/><label className="native-check"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>{mode==='received'?'أؤكد استلام هذه القطع فعلًا':'أؤكد تسجيل التصرف منفصلًا عن الاستلام'}</label><ActionButton disabled={!confirm||!items.length} type="submit">{mode==='received'?'تأكيد القطع المستلمة فقط':'تسجيل الفقد أو التلف'}</ActionButton></form>;
}
function Integration({commands}:{commands:CommandRow[]}){
 const [projections,setProjections]=useState<S['ConsumerStatus'][]>([]),[error,setError]=useState(''),[delivery,setDelivery]=useState<{pending:number;sending:number;failed:number;received:number}|null>(null);
 useEffect(()=>{void api<{counts:{pending:number;sending:number;failed:number;received:number}}>('/native/delivery').then(r=>setDelivery(r.counts)).catch(e=>setError(e.message));void api<S['ConsumerStatus'][]>('/native/projections').then(setProjections).catch(e=>setError(e.message));},[commands]);
 return <section className="native-card"><h2>حالة المصدر والتنفيذ</h2><p>قبول الطلب في توصيل مستقل عن وصول حدث التنفيذ وتطبيقه هنا.</p>{error&&<p role="alert">{error}</p>}<p>طلبات المصدر: {commands.length} · بانتظار الرد: {commands.filter(c=>c.status==='pending').length} · مرفوض: {commands.filter(c=>c.status==='rejected').length}</p>{delivery&&<p>أحداث توصيل الصادرة — انتظار: {delivery.pending} · إرسال: {delivery.sending} · فشل: {delivery.failed} · استُقبل: {delivery.received}</p>}{projections.map((p,i)=><article className="native-shipment" key={i}><bdi>{p.checkpoint.aggregate.id}</bdi><p>استُقبل حتى: {p.checkpoint.receivedThrough} · طُبق حتى: {p.checkpoint.appliedThrough}</p><p>بانتظار التطبيق: {p.checkpoint.pendingCount} · {p.checkpoint.historyComplete?'التاريخ مكتمل':'يوجد تاريخ غير متاح'}</p></article>)}</section>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
