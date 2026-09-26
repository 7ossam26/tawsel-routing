import {createHash,randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import ExcelJS from 'exceljs';
import type {components} from '@tawsel/api-client';
import {AccessDenied,type AuthenticatedPrincipal} from '../access/service.js';
import {payloadHash} from '../commands/json.js';
import {ReportingError,type Query,type Report} from './models.js';
import {Reporting} from './service.js';

const outcomeLabels:Record<string,string>={full:'تسليم كامل',partial:'تسليم جزئي',refused:'رفض الاستلام','no-answer':'لم يرد',unfinished:'لم تنتهِ',deferred:'مؤجلة'};
const clockLabels:Record<string,string>={available:'مسجّل',uncertain:'غير مؤكّد',missing:'غير مسجّل'};
const missing='غير مسجّل';

function textCell(cell:ExcelJS.Cell,value:string|null|undefined){cell.numFmt='@';cell.value=value??missing;}
function styleSheet(sheet:ExcelJS.Worksheet,widths:number[]){
 sheet.views=[{rightToLeft:true,state:'frozen',ySplit:1}];sheet.properties.defaultRowHeight=21;
 sheet.getRow(1).eachCell(cell=>{cell.font={bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF16324F'}};cell.alignment={horizontal:'right',vertical:'middle',wrapText:true};});
 sheet.getRow(1).height=30;widths.forEach((width,index)=>{sheet.getColumn(index+1).width=width;});
 sheet.eachRow((row,index)=>{if(index>1)row.eachCell(cell=>{cell.alignment={horizontal:'right',vertical:'top',wrapText:true};});});
 if(sheet.rowCount>1)sheet.autoFilter={from:{row:1,column:1},to:{row:sheet.rowCount,column:widths.length}};
}
function addMeta(sheet:ExcelJS.Worksheet,label:string,value:string|number|null){const row=sheet.addRow([label,value??missing]);textCell(row.getCell(1),label);if(typeof value==='number')row.getCell(2).value=value;else textCell(row.getCell(2),value);}
function stopFor(report:Report,attemptId:string){return report.timing.flatMap(round=>round.stops).find(stop=>stop.attemptId===attemptId);}

/** Creates formula-free XLSX bytes from the already-authorized immutable report object. */
export async function buildReportWorkbook(report:Report):Promise<Buffer>{
 const workbook=new ExcelJS.Workbook();workbook.creator='Tawsel';workbook.created=new Date(report.asOf);workbook.modified=new Date(report.asOf);workbook.calcProperties.fullCalcOnLoad=false;
 const meta=workbook.addWorksheet('بيانات التقرير',{views:[{rightToLeft:true}]});meta.addRow(['البيان','القيمة']);
 addMeta(meta,'إصدار التعريف',report.definitionVersion);addMeta(meta,'معرّف snapshot',report.snapshotId);addMeta(meta,'حالة البيانات في',report.asOf);addMeta(meta,'المنطقة الزمنية للعرض',report.displayTimeZone);addMeta(meta,'معرّف يوم العمل',report.workdayId);addMeta(meta,'معرّف المندوب',report.driverId);addMeta(meta,'بدأ يوم العمل',report.openedAt);addMeta(meta,'انتهى يوم العمل',report.endedAt);
 addMeta(meta,'تصفية الجولة',report.filters.roundId);addMeta(meta,'تصفية المندوب',report.filters.driverId);addMeta(meta,'تصفية الفرع',report.filters.branchId);addMeta(meta,'تصفية النتيجة',report.filters.outcome?(outcomeLabels[report.filters.outcome]??report.filters.outcome):null);addMeta(meta,'نطاق البيانات','نتائج قبلها الخادم فقط؛ إجراءات الهاتف غير المرسلة غير معروفة للخادم');styleSheet(meta,[27,76]);

 const summary=workbook.addWorksheet('الملخص');summary.addRow(['المقياس','القيمة','الوحدة']);
 const countRows:[string,number|string|null,string][]=[['الشحنات',report.counts.shipments,'شحنة'],['المحاولات',report.counts.attempts,'محاولة'],['المحاولات ذات النتيجة',report.counts.processedAttempts,'محاولة'],['المحاولات غير الناجحة',report.counts.failedAttempts,'محاولة'],['المحاولات المؤجلة',report.counts.deferredAttempts,'محاولة'],['الشحنات ذات النتيجة',report.counts.processedShipments,'شحنة'],['التسليم الكامل',report.counts.fullShipments,'شحنة'],['التسليم الجزئي',report.counts.partialShipments,'شحنة'],['رفض الاستلام',report.counts.refusedShipments,'شحنة'],['عدم الرد',report.counts.noAnswerShipments,'شحنة'],['المؤجل',report.counts.deferredShipments,'شحنة'],['غير المنتهي',report.counts.unfinishedShipments,'شحنة'],['نسبة التسليم الكامل',report.counts.fullDeliveryPercent,'%'],['شحنات النطاق قبل تصفية النتيجة',report.scopeCounts.shipments,'شحنة'],['محاولات النطاق قبل تصفية النتيجة',report.scopeCounts.attempts,'محاولة']];
 if(report.pieces)countRows.push(['خرجت للتوصيل',report.pieces.dispatched,'قطعة'],['سُلّمت',report.pieces.delivered,'قطعة'],['مع المندوب',report.pieces.held,'قطعة'],['مطلوب إرجاعها',report.pieces.returnRequired,'قطعة'],['استلمها الفرع',report.pieces.received,'قطعة'],['فقد',report.pieces.lost,'قطعة'],['تلف',report.pieces.damaged,'قطعة']);
 for(const [label,value,unit] of countRows){const row=summary.addRow([label,value??missing,unit]);textCell(row.getCell(1),label);if(value===null)textCell(row.getCell(2),missing);textCell(row.getCell(3),unit);}styleSheet(summary,[38,20,18]);

 const collections=workbook.addWorksheet('التحصيل');collections.addRow(['العملة','الأس','الإجمالي بوحدات صغرى دقيقة','البضاعة بوحدات صغرى دقيقة','الشحن المحصّل بوحدات صغرى دقيقة','الشحن غير المدفوع بوحدات صغرى دقيقة','محاولات بلا مبلغ']);
 for(const item of report.collections){const row=collections.addRow([item.currency,item.exponent,item.reportedMinor,item.goodsMinor,item.shippingMinor,item.unpaidShippingMinor,item.unreportedAttempts]);for(const index of [1,3,4,5,6])textCell(row.getCell(index),String(row.getCell(index).value));}styleSheet(collections,[14,10,27,27,29,31,21]);

 const attempts=workbook.addWorksheet('المحاولات');attempts.addRow(['#','معرّف الشحنة','معرّف المحاولة','معرّف الجولة','دورة الشحن','الفرع','اسم المستلم','النتيجة الحالية','مؤجلة','التحصيل بوحدات صغرى دقيقة','العملة','الأس','وقت القبول','الوصول الفعلي','حالة ساعة الوصول','الإتمام الفعلي','حالة ساعة الإتمام']);
 report.attempts.forEach((attempt,index)=>{const stop=stopFor(report,attempt.attemptId),money=attempt.outcome?.collection.reported,outcome=attempt.outcome?outcomeLabels[attempt.outcome.outcome]??attempt.outcome.outcome:attempt.deferred?outcomeLabels.deferred!:outcomeLabels.unfinished!;const row=attempts.addRow([index+1,attempt.taskId,attempt.attemptId,attempt.roundId,attempt.dispatchCycleId??missing,attempt.branchId??missing,attempt.recipientName,outcome,attempt.deferred?'نعم':'لا',money?String(money.amountMinor):missing,money?.currency??missing,money?.exponent??missing,attempt.admittedAt,stop?.arrival.observedAt??missing,clockLabels[stop?.arrival.status??'missing']??missing,stop?.completion.observedAt??missing,clockLabels[stop?.completion.status??'missing']??missing]);for(const cell of [2,3,4,5,6,7,8,9,10,11,13,14,15,16,17])textCell(row.getCell(cell),String(row.getCell(cell).value));});styleSheet(attempts,[7,38,38,38,38,38,34,20,10,29,12,9,27,27,20,27,20]);

 const history=workbook.addWorksheet('سجل النتائج');history.addRow(['معرّف المحاولة','#','معرّف النتيجة','النتيجة','التحصيل بوحدات صغرى دقيقة','العملة','الأس','وقت الفعل على الهاتف','وقت قبول الخادم','الحالية']);
 for(const attempt of report.attempts)attempt.history.forEach((item,index)=>{const money=item.collection.reported,row=history.addRow([attempt.attemptId,index+1,item.outcomeId,outcomeLabels[item.outcome]??item.outcome,money?String(money.amountMinor):missing,money?.currency??missing,money?.exponent??missing,item.time.observation.observedAt??missing,item.time.recordedAt,index===attempt.history.length-1?'نعم':'لا']);for(const cell of [1,3,4,5,6,8,9,10])textCell(row.getCell(cell),String(row.getCell(cell).value));});styleSheet(history,[38,7,38,20,29,12,9,27,27,10]);

 const timing=workbook.addWorksheet('التوقيت');timing.addRow(['معرّف الجولة','معرّف المحاولة','معرّف الشحنة','توقع البداية','آخر توقع','الوصول المتوقع الأخير','الإتمام المتوقع الأخير','الوصول الفعلي','حالة ساعة الوصول','الإتمام الفعلي','حالة ساعة الإتمام','زمن الطريق بالثواني','سبب غياب زمن الطريق','زمن الخدمة بالثواني','سبب غياب زمن الخدمة']);
 for(const round of report.timing)for(const stop of round.stops){const row=timing.addRow([round.roundId,stop.attemptId,stop.taskId,stop.baseline?.forecastId??missing,stop.latest?.forecastId??missing,stop.latest?.expectedArrivalAt??missing,stop.latest?.expectedCompletionAt??missing,stop.arrival.observedAt??missing,clockLabels[stop.arrival.status],stop.completion.observedAt??missing,clockLabels[stop.completion.status],stop.travel.seconds??missing,stop.travel.reason??missing,stop.service.seconds??missing,stop.service.reason??missing]);for(const cell of [1,2,3,4,5,6,7,8,9,10,11,13,15])textCell(row.getCell(cell),String(row.getCell(cell).value));}styleSheet(timing,[38,38,38,38,38,27,27,27,20,27,20,22,28,22,28]);

 const returns=workbook.addWorksheet('الإرجاع');returns.addRow(['معرّف المحاولة','معرّف الحركة','النوع','الكمية','حالة التقرير في']);
 for(const attempt of report.attempts)for(const item of attempt.returns){const row=returns.addRow([attempt.attemptId,item.transitionId,item.kind,item.quantity,report.asOf]);for(const cell of [1,2,3,5])textCell(row.getCell(cell),String(row.getCell(cell).value));}styleSheet(returns,[38,38,18,12,27]);
 const bytes=await workbook.xlsx.writeBuffer();return Buffer.from(bytes);
}

export interface ExportRequest {snapshotId:string;filters?:Omit<Query,'snapshotId'>}
export interface ExportStatus {exportId:string;status:'ready'|'expired';snapshotId:string;createdAt:string;expiresAt:string;fileName:string;bytes:number;downloadUrl:string|null}
interface Entry extends ExportStatus {ownerKey:string;requestKey:string;visibilityHash:string;workdayId:string;filters:Omit<Query,'snapshotId'>;kind:'personal'|'company';buffer:Buffer|undefined;purgeAt:number}

export class ReportExportStore {
 private readonly records=new Map<string,Entry>();
 constructor(private readonly now=()=>Date.now(),private readonly ttlMs=10*60_000,private readonly maxReady=16,private readonly maxBytes=4*1024*1024,private readonly maxRecords=64){}
 private cleanup(){const now=this.now();for(const entry of this.records.values()){if(entry.status==='ready'&&Date.parse(entry.expiresAt)<=now){entry.status='expired';entry.buffer=undefined;entry.downloadUrl=null;}if(entry.purgeAt<=now)this.records.delete(entry.exportId);}while(this.records.size>this.maxRecords){const expired=[...this.records.values()].find(entry=>entry.status==='expired')??this.records.values().next().value as Entry|undefined;if(!expired)break;this.records.delete(expired.exportId);}}
 find(requestKey:string,ownerKey:string,visibilityHash:string){this.cleanup();return [...this.records.values()].find(entry=>entry.status==='ready'&&entry.requestKey===requestKey&&entry.ownerKey===ownerKey&&entry.visibilityHash===visibilityHash);}
 put(input:Omit<Entry,'exportId'|'status'|'createdAt'|'expiresAt'|'bytes'|'downloadUrl'|'purgeAt'> & {buffer:Buffer}):Entry{
  this.cleanup();if(input.buffer.byteLength>this.maxBytes)throw new ReportingError('export_too_large',413,'حجم ملف التقرير أكبر من حد التصدير المسموح.');
  const ready=[...this.records.values()].filter(entry=>entry.status==='ready');if(ready.length>=this.maxReady){const oldest=ready.sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt))[0]!;oldest.status='expired';oldest.buffer=undefined;oldest.downloadUrl=null;}
  const now=this.now(),exportId=randomUUID(),createdAt=new Date(now).toISOString(),expiresAt=new Date(now+this.ttlMs).toISOString();
  const entry:Entry={...input,exportId,status:'ready',createdAt,expiresAt,bytes:input.buffer.byteLength,downloadUrl:`/api/v1/report-exports/${exportId}/download?kind=${input.kind}`,purgeAt:now+this.ttlMs*2};this.records.set(exportId,entry);this.cleanup();return entry;
 }
 owned(exportId:string,ownerKey:string):Entry{this.cleanup();const entry=this.records.get(exportId);if(!entry||entry.ownerKey!==ownerKey)throw new AccessDenied(true);return entry;}
 public(entry:Entry):ExportStatus{const {exportId,status,snapshotId,createdAt,expiresAt,fileName,bytes,downloadUrl}=entry;return {exportId,status,snapshotId,createdAt,expiresAt,fileName,bytes,downloadUrl};}
}

const ownerKey=(principal:AuthenticatedPrincipal)=>principal.kind==='account'?`account:${principal.issuer}:${principal.subject}`:`integration:${principal.integrationId}`;
const visibilityHash=(access:components['schemas']['AccessContext'])=>payloadHash({...access,branchIds:[...access.branchIds].sort(),effectiveCapabilities:[...access.effectiveCapabilities].sort()});
const requestHash=(owner:string,kind:string,workdayId:string,input:ExportRequest)=>createHash('sha256').update(JSON.stringify({owner,kind,workdayId,snapshotId:input.snapshotId,filters:{roundId:input.filters?.roundId??null,driverId:input.filters?.driverId??null,branchId:input.filters?.branchId??null,outcome:input.filters?.outcome??null}})).digest('hex');

export class ReportExports {
 private readonly pending=new Map<string,Promise<ExportStatus>>();
 constructor(readonly pool:Pool,readonly store=new ReportExportStore(),readonly reporting=new Reporting(pool)){}
 async create(principal:AuthenticatedPrincipal,kind:'personal'|'company',workdayId:string,input:ExportRequest):Promise<ExportStatus>{
  const owner=ownerKey(principal),key=requestHash(owner,kind,workdayId,input),existing=this.pending.get(key);if(existing)return existing;
  const task=this.createOnce(principal,owner,key,kind,workdayId,input).finally(()=>this.pending.delete(key));this.pending.set(key,task);return task;
 }
 private async createOnce(principal:AuthenticatedPrincipal,owner:string,key:string,kind:'personal'|'company',workdayId:string,input:ExportRequest):Promise<ExportStatus>{
  const filters=input.filters??{},captured=await this.reporting.exportSnapshot(principal,workdayId,{...filters,snapshotId:input.snapshotId}),accessHash=visibilityHash(captured.access),reused=this.store.find(key,owner,accessHash);if(reused)return this.store.public(reused);
  const buffer=await buildReportWorkbook(captured.report),fileName=`tawsel-workday-${workdayId.slice(0,8)}-${captured.report.snapshotId.slice(0,8)}.xlsx`;
  return this.store.public(this.store.put({ownerKey:owner,requestKey:key,visibilityHash:accessHash,workdayId,filters,kind,snapshotId:captured.report.snapshotId,fileName,buffer}));
 }
 private async current(principal:AuthenticatedPrincipal,kind:'personal'|'company',exportId:string){const entry=this.store.owned(exportId,ownerKey(principal));if(entry.kind!==kind)throw new AccessDenied(true);const access=await this.reporting.authorizeExport(principal,entry.workdayId,entry.filters);if(visibilityHash(access)!==entry.visibilityHash)throw new AccessDenied();return entry;}
 async status(principal:AuthenticatedPrincipal,kind:'personal'|'company',exportId:string){return this.store.public(await this.current(principal,kind,exportId));}
 async download(principal:AuthenticatedPrincipal,kind:'personal'|'company',exportId:string){const entry=await this.current(principal,kind,exportId);if(entry.status!=='ready'||!entry.buffer)throw new ReportingError('export_expired',410,'انتهت صلاحية ملف التصدير؛ أنشئ ملفًا جديدًا من التقرير الحالي.');return {status:this.store.public(entry),buffer:Buffer.from(entry.buffer)};}
}
