import type { components } from '@tawsel/api-client';
import { conforms,validateAllocation } from '../b2b-intake/schema.js';
import { OutcomeError,operations,requireOutcome,type Calculation,type Money,type Operation,type OutcomePayload } from './models.js';

export type Frozen = {kind:'company';snapshot:components['schemas']['B2bSourceSnapshot'];previousShippingCollectedMinor:number;previousDeliveredPieces:number}
 | {kind:'personal';collection:Money|null};
export const money=(amountMinor:number):Money=>({amountMinor,currency:'EGP',exponent:2});
function invalid(message:string):never {throw new OutcomeError('validation_failed',400,message);}
function bounded(value:bigint){if(value<0n||value>BigInt(Number.MAX_SAFE_INTEGER))invalid('المبلغ خارج النطاق الصحيح.');return Number(value);}
function reported(p:OutcomePayload,amount:number){
 if(!p.reportedCollection||p.reportedCollection.amountMinor!==amount)invalid('أكّد تحصيل المبلغ المطلوب كاملًا.');
 return money(amount);
}
/** Inputs are the immutable outstanding dispatch allocation and accepted ledger.
 * BigInt intermediates; never apportion deposits, quote ERP or use floats. */
export function calculate(operation:Operation,p:OutcomePayload,frozen:Frozen):Calculation {
 requireOutcome(operations[operation],p);
 const outcome:Calculation['outcome']=operation==='outcome.recordFull'?'full':operation==='outcome.recordPartial'?'partial':operation==='outcome.recordRefusal'?'refused':'no-answer';
 const collection:Calculation['collection']={reported:null,goods:money(0),shipping:money(0),unpaidShipping:money(0),shippingStatus:'not-applicable'};
 if(frozen.kind==='personal'){
  if(outcome==='partial'||p.pieces||p.shippingPayment)invalid('نتيجة المندوب المستقل لا تتضمن قطعًا أو رسوم شحن.');
  if(outcome==='full'&&frozen.collection){requireOutcome('Money',frozen.collection);collection.reported=reported(p,frozen.collection.amountMinor);collection.goods=frozen.collection;}
  else if(p.reportedCollection)invalid('لا يوجد مبلغ تحصيل لهذه النتيجة.');
  return {kind:'personal',outcome,lines:[],collection,returnRequired:false};
 }
 const s=frozen.snapshot;
 if(!conforms('SourceSnapshot',s))throw new OutcomeError('unsupported_price_allocation',422,'تخصيص المصدر غير صالح.');
 validateAllocation(s);
 if(!Number.isSafeInteger(frozen.previousShippingCollectedMinor)||frozen.previousShippingCollectedMinor<0||frozen.previousShippingCollectedMinor>s.shippingDue.amountMinor)invalid('سجل تحصيل الشحن غير متوافق.');
 if(frozen.previousDeliveredPieces!==0)throw new OutcomeError('lifecycle_forbidden',409,'الجزء المرفوض من تسليم جزئي للإرجاع فقط.');
 const shipping=s.shippingDue.amountMinor-frozen.previousShippingCollectedMinor;
 if(outcome==='partial'){
  if(!s.splittingAllowed)invalid('المصدر لا يسمح بتقسيم هذه الشحنة.');
  if(p.pieces!.length!==s.lines.length||new Set(p.pieces!.map(l=>l.sourceLineId)).size!==s.lines.length||p.pieces!.some(l=>!s.lines.some(source=>source.sourceLineId===l.sourceLineId)))invalid('حدّد كل بند مرة واحدة بمعرّف المصدر.');
 }
 const lines=s.lines.map(line=>{
  const delivered=outcome==='full'?line.quantity:outcome==='partial'?p.pieces!.find(l=>l.sourceLineId===line.sourceLineId)!.delivered:0;
  if(delivered>line.quantity)invalid('الكمية تتجاوز القطع المتاحة.');
  return {sourceLineId:line.sourceLineId,sourceQuantity:line.quantity,delivered,heldReturnRequired:line.quantity-delivered,unitDue:line.unitDue};
 });
 if(outcome==='partial'&&(!lines.some(l=>l.delivered>0)||!lines.some(l=>l.heldReturnRequired>0)))invalid('التسليم الجزئي يتطلب قطعًا مستلمة وأخرى مرفوضة.');
 const goods=bounded(lines.reduce((n,l)=>n+BigInt(l.delivered)*BigInt(l.unitDue.amountMinor),0n));
 collection.goods=money(goods);
 if(outcome==='no-answer')collection.shippingStatus='not-attempted';
 else if(outcome==='refused'&&p.shippingPayment==='refused'){
  if(shipping===0)invalid('لا توجد رسوم شحن مستحقة لتسجيل رفض دفعها.');
  collection.reported=reported(p,0);collection.unpaidShipping=money(shipping);collection.shippingStatus='explicitly-unpaid';
 }else{
  if(outcome==='refused'&&p.shippingPayment!=='collected')invalid('حدّد تحصيل الشحن أو رفض دفعه صراحةً.');
  collection.shipping=money(shipping);collection.shippingStatus=shipping>0?'collected':'not-due';
  collection.reported=reported(p,bounded(BigInt(goods)+BigInt(shipping)));
 }
 return {kind:'company',outcome,lines,collection,returnRequired:lines.some(l=>l.heldReturnRequired>0)};
}
