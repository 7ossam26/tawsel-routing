import {useState,type FormEvent} from 'react';
import type {components} from '@tawsel/api-client';
import {ActionButton,Field,StatusNotice} from '../../web/src/components/ui';

type S=components['schemas'];
type Profile=S['Mode'];
export type RecordRow={kind:string;external_id:string;revision:number;desired:Record<string,unknown>;status:string;result:S['ActionResult']|null;last_error:string|null};
export type Submit=(op:string,payload:Record<string,unknown>,keys:string[])=>Promise<void>;
const statusText:Record<string,string>={pending:'محفوظ — بانتظار توصيل',accepted:'قبله توصيل',rejected:'رفضه توصيل','review-required':'يحتاج مراجعة'};
export function Select({label,value,onChange,items}:{label:string;value:string;onChange:(s:string)=>void;items:{value:string;label:string}[]}){return <label className="native-select">{label}<select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}><option value="">اختر</option>{items.map(i=><option key={i.value} value={i.value}>{i.label}</option>)}</select></label>;}
export const options=(rows:RecordRow[],kind:string)=>rows.filter(r=>r.kind===kind&&r.status==='accepted').map(r=>({value:r.external_id,label:String(r.desired.name??r.external_id)}));
const supportedProfile=(value:unknown):value is Profile=>value==='car'||value==='motorcycle';
function storedSnapshot(value:unknown):Partial<S['B2bSourceSnapshot']>|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return;
 const candidate=value as Partial<S['B2bSourceSnapshot']>;
 // Assignment commands also have shipment records, but contain no source snapshot.
 if(typeof candidate.sourceBranchExternalId!=='string'||typeof candidate.recipientName!=='string'||typeof candidate.recipientPhone!=='string'||
   !candidate.destination||!['address','confirmed-pin'].includes(candidate.destination.kind)||!Array.isArray(candidate.lines)||!candidate.lines.length||!candidate.shippingDue||!candidate.totalDue)return;
 return candidate;
}

async function provisioningStatus(externalId:string){
 const response=await fetch(`/native/provisioning?entity=user&externalId=${encodeURIComponent(externalId)}`,{credentials:'same-origin'});
 if(!response.ok)throw new Error('تعذر فحص جاهزية الحساب. حاول مجددًا.');
 return await response.json() as S['ProvisioningStatus'];
}

export function Administration({rows,submit}:{rows:RecordRow[];submit:Submit}){
 const [kind,setKind]=useState('branch'),[id,setId]=useState(''),[name,setName]=useState(''),[subject,setSubject]=useState(''),[role,setRole]=useState(''),[branch,setBranch]=useState(''),[cap,setCap]=useState('execution.own'),[effect,setEffect]=useState('inherit'),[issuer,setIssuer]=useState('');
 const [profiles,setProfiles]=useState<Record<string,string>>({});
 const entity=kind==='exceptions'?'user':kind,old=rows.find(r=>r.kind===entity&&r.external_id===id),revision=Number(old?.desired.sourceRevision??0)+1;
 // A saved profile is authoritative until the operator explicitly chooses a new one.
 const profile=Object.hasOwn(profiles,id)?profiles[id]!:(old?(supportedProfile(old.desired.profile)?old.desired.profile:''):'motorcycle');
 const save=async(e:FormEvent)=>{e.preventDefault();let op:string,p:Record<string,unknown>;
  if(kind==='branch'){op='branch.provision';p={externalId:id,sourceRevision:revision,name,enabled:true,location:null};}
  else if(kind==='role'){op='role.defineCapabilities';p={externalId:id,sourceRevision:revision,name,capabilities:[cap]};}
  else if(kind==='user'){op='user.provision';p={externalId:id,sourceRevision:revision,subject,roleExternalId:role,branchExternalIds:[branch],enabled:true};}
  else if(kind==='driver'){if(!supportedProfile(profile))return;op='driver.provisionReference';p={externalId:id,sourceRevision:revision,userExternalId:subject,enabled:true,profile,vehicleReference:old?.desired.vehicleReference??null};}
  else {op='user.setCapabilityExceptions';const previous=(old?.desired.exceptions??[]) as {capability:string;effect:string}[];p={externalId:id,sourceRevision:revision,exceptions:[...previous.filter(x=>x.capability!==cap),{capability:cap,effect}]};}
  await submit(op,p,[`${entity}/${id}`]);
 };
 return <section className="native-card"><h2>إدارة المستخدمين والفروع</h2><p>البيانات تذهب إلى التهيئة الموثوقة. اسم الدور وحده لا يمنح صلاحية.</p><Select label="نوع التعديل" value={kind} onChange={setKind} items={[{value:'branch',label:'فرع'},{value:'role',label:'دور وصلاحياته'},{value:'user',label:'مستخدم ودوره وفرعه'},{value:'driver',label:'مرجع مندوب'},{value:'exceptions',label:'استثناء صلاحية مستخدم'}]}/>
 <form onSubmit={e=>void save(e).catch(()=>{})} className="native-form"><Field id="admin-id" label="مرجع المصدر" required value={id} onChange={e=>setId(e.target.value)}/>
 {(kind==='branch'||kind==='role')&&<Field id="admin-name" label="الاسم" required value={name} onChange={e=>setName(e.target.value)}/>}
 {(kind==='user'||kind==='driver')&&<Field id="admin-subject" label={kind==='user'?'معرف المستخدم في جهة الهوية':'مرجع مستخدم ERP'} required value={subject} onChange={e=>setSubject(e.target.value)}/>}
 {kind==='user'&&<><Select label="دور المستخدم" value={role} onChange={setRole} items={options(rows,'role')}/><Select label="فرع المستخدم" value={branch} onChange={setBranch} items={options(rows,'branch')}/></>}
 {kind==='driver'&&<><Select label="وسيلة حركة المندوب" value={profile} onChange={value=>setProfiles(current=>({...current,[id]:value}))} items={[{value:'motorcycle',label:'دراجة نارية'},{value:'car',label:'سيارة'}]}/>{!supportedProfile(profile)&&<StatusNotice tone="error" title="اختر سيارة أو دراجة نارية؛ وسيلة الحركة المحفوظة غير متاحة."/>}</>}
 {(kind==='role'||kind==='exceptions')&&<Select label="الصلاحية" value={cap} onChange={setCap} items={[{value:'execution.own',label:'تنفيذ المندوب'},{value:'monitor.read',label:'عرض المتابعة'},{value:'return.receive',label:'استلام المرتجعات'},{value:'return.dispose',label:'تسجيل الفقد والتلف'},{value:'planning.manage',label:'إدارة التخطيط'}]}/>}
 {kind==='exceptions'&&<Select label="استثناء المستخدم" value={effect} onChange={setEffect} items={[{value:'inherit',label:'وراثة من الدور'},{value:'allow',label:'سماح'},{value:'deny',label:'منع'}]}/>}
 <ActionButton type="submit" disabled={kind==='driver'&&!supportedProfile(profile)}>حفظ وإرسال التعديل</ActionButton></form>
 {old&&<p>آخر طلب: {statusText[old.status]} · المراجعة المحلية {old.revision}</p>}
 {(kind==='user'||kind==='exceptions')&&<><ActionButton variant="quiet" onClick={()=>void provisioningStatus(id).then(s=>setIssuer(s.issuerStatus==='ready'?(s.enabled?'الحساب جاهز لدى جهة الهوية':'الحساب معطل'):'بانتظار تأكيد جهة الهوية')).catch(e=>setIssuer(e.message))}>فحص جاهزية الحساب</ActionButton><p role="status">{issuer}</p></>}
 </section>;
}

export function SnapshotForm({task,rows,submit,close,previous}:{task:S['B2bTask']|null;rows:RecordRow[];submit:Submit;close:()=>void;previous?:{externalId:string;cycleId:string;sourceRevision:number;quantity:number}}){
 const local=rows.find(r=>r.kind==='shipment'&&r.external_id===(task?.externalId??previous?.externalId));
 const old=task?.snapshot??storedSnapshot(local?.desired.snapshot)??storedSnapshot(local?.desired)??{};
 const [id,setId]=useState(task?.externalId??previous?.externalId??''),[branch,setBranch]=useState(old.sourceBranchExternalId??''),[name,setName]=useState(old.recipientName??''),[phone,setPhone]=useState(old.recipientPhone??''),[quantity,setQuantity]=useState(String(previous?.quantity??old.lines?.[0]?.quantity??3)),[unit,setUnit]=useState(String(old.lines?.[0]?.unitDue.amountMinor??10000)),[shipping,setShipping]=useState(String(old.shippingDue?.amountMinor??5000)),[latitude,setLatitude]=useState(String(old.destination?.kind==='confirmed-pin'?old.destination.coordinates.latitude:'')),[longitude,setLongitude]=useState(String(old.destination?.kind==='confirmed-pin'?old.destination.coordinates.longitude:'')),[pin,setPin]=useState(false),[split,setSplit]=useState(old.splittingAllowed??true);
 const [destinationKind,setDestinationKind]=useState<S['IndependentDestination']['kind']>(old.destination?.kind??'address'),[address,setAddress]=useState(old.destination?.addressText??'');
 const coordinatesValid=latitude.trim()!==''&&longitude.trim()!==''&&Number.isFinite(Number(latitude))&&Number.isFinite(Number(longitude))&&Number(latitude)>=-90&&Number(latitude)<=90&&Number(longitude)>=-180&&Number(longitude)<=180;
 const destinationReady=destinationKind==='address'?address.trim().length>0:destinationKind==='confirmed-pin'&&pin&&coordinatesValid;
 const save=async(e:FormEvent)=>{e.preventDefault();if(!branch||!destinationReady)return;const sourceRevision=(task?.sourceRevision??previous?.sourceRevision??0)+1;const money=(amountMinor:number)=>({amountMinor,currency:'EGP',exponent:2});
  const addressText=address.trim();
  const destination:S['IndependentDestination']=destinationKind==='address'?{kind:'address',addressText}:{kind:'confirmed-pin',coordinates:{latitude:Number(latitude),longitude:Number(longitude)},...(addressText?{addressText}:{})};
  const snapshot={externalId:id,sourceDispatchCycleId:task?.sourceDispatchCycleId??`cycle-${crypto.randomUUID()}`,sourceRevision,expectedSourceRevision:sourceRevision-1,sourceBranchExternalId:branch,recipientName:name,recipientPhone:phone,destination,splittingAllowed:split,allocation:'exact-outstanding-per-unit',lines:[{sourceLineId:old.lines?.[0]?.sourceLineId??'pieces',description:old.lines?.[0]?.description??'قطع',quantity:Number(quantity),unitDue:money(Number(unit))}],shippingDue:money(Number(shipping)),totalDue:money(Number(quantity)*Number(unit)+Number(shipping)),priority:'ordinary'};
  await submit(previous?'dispatch.createFromReceipt':'intake.submitSnapshot',previous?{externalId:id,previousDispatchCycleId:previous.cycleId,snapshot}:snapshot,[`shipment/${id}`]);close();
 };
 return <section className="native-card"><h2>{previous?'دورة إرسال جديدة من القطع المستلمة':task?'تعديل بيانات المصدر':'شحنة اختبار جديدة'}</h2><p>نموذج صغير لسطر قطع واحد. المبالغ بالقروش. العنوان المكتوب يحتاج تأكيد نقطة التسليم من المندوب قبل التخطيط.</p><form className="native-form" onSubmit={e=>void save(e).catch(()=>{})}>
 <Field id="shipment-id" label="مرجع الشحنة" required readOnly={!!task||!!previous} value={id} onChange={e=>setId(e.target.value)}/><Select label="فرع الإرسال" value={branch} onChange={setBranch} items={options(rows,'branch')}/>
 <Field id="recipient" label="اسم المستلم" required value={name} onChange={e=>setName(e.target.value)}/><Field id="phone" label="الهاتف" required value={phone} onChange={e=>setPhone(e.target.value)}/>
 <Field id="quantity" label="عدد القطع" type="number" min={1} max={previous?.quantity??1000000} step={1} required value={quantity} onChange={e=>setQuantity(e.target.value)}/><Field id="unit" label="المستحق لكل قطعة — قرش" type="number" min={0} step={1} required value={unit} onChange={e=>setUnit(e.target.value)}/><Field id="shipping" label="الشحن المستحق — قرش" type="number" min={0} step={1} required value={shipping} onChange={e=>setShipping(e.target.value)}/>
 <Select label="طريقة تحديد العنوان" value={destinationKind} onChange={value=>{if(value==='address'||value==='confirmed-pin'){setDestinationKind(value);setPin(false);}}} items={[{value:'address',label:'عنوان مكتوب — يراجعه المندوب'},{value:'confirmed-pin',label:'نقطة راجعتها بالإحداثيات'}]}/>
 <Field id="address-text" label={destinationKind==='address'?'العنوان المكتوب':'العنوان المكتوب (اختياري)'} required={destinationKind==='address'} maxLength={500} value={address} onChange={e=>{setAddress(e.target.value);setPin(false);}}/>
 {destinationKind==='address'?<p>بعد الاستلام، يفتح المندوب «مراجعة الموقع» ويؤكد النقطة على الخريطة. لو البحث غير متاح، يمكنه اختيار النقطة يدويًا.</p>:<><Field id="latitude" label="خط العرض" type="number" min={-90} max={90} step="any" required value={latitude} onChange={e=>{setLatitude(e.target.value);setPin(false);}}/><Field id="longitude" label="خط الطول" type="number" min={-180} max={180} step="any" required value={longitude} onChange={e=>{setLongitude(e.target.value);setPin(false);}}/>
 <label className="native-check"><input type="checkbox" checked={pin} onChange={e=>setPin(e.target.checked)}/>راجعت نقطة التسليم وأؤكدها</label></>}
 <label className="native-check"><input type="checkbox" checked={split} onChange={e=>setSplit(e.target.checked)}/>المصدر يسمح بتسليم جزئي</label>
 <ActionButton disabled={!destinationReady||!branch} type="submit">حفظ وإرسال الشحنة</ActionButton><ActionButton variant="quiet" type="button" onClick={close}>إلغاء</ActionButton></form></section>;
}
