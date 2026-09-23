import { describe,it,expect } from 'vitest';
import type { components } from '@tawsel/api-client';
import { calculate,money,type Frozen } from '../../src/outcomes/arithmetic.js';
import { outcomeConforms,type OutcomePayload } from '../../src/outcomes/models.js';
const id='11111111-1111-4111-8111-111111111111';
const target={roundId:id,taskId:id,attemptId:id,expectedActivityRevision:0,expectedCurrentAttemptId:null,expectedSourceRevision:1,expectedAssignmentRevision:1,expectedPinRevision:0};
const source:components['schemas']['B2bSourceSnapshot']={externalId:'shipment',sourceDispatchCycleId:'cycle',sourceRevision:1,expectedSourceRevision:0,sourceBranchExternalId:'branch',recipientName:'عميل',recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30,longitude:31}},splittingAllowed:true,allocation:'exact-outstanding-per-unit',lines:[{sourceLineId:'pieces',description:'قطع',quantity:3,unitDue:money(10000)}],shippingDue:money(5000),totalDue:money(35000),priority:'ordinary'};
const frozen=(snapshot=source,previousShippingCollectedMinor=0):Frozen=>({kind:'company',snapshot,previousShippingCollectedMinor,previousDeliveredPieces:0});
const full=(amount:number)=>({...target,reportedCollection:money(amount)});
const partial=(delivered=2,amount=25000):OutcomePayload=>({...full(amount),pieces:[{sourceLineId:'pieces',delivered}]});
describe('P17 frozen whole-piece and integer-minor arithmetic',()=>{
 it('calculates 350 full, 250 partial and conserves all three whole pieces',()=>{
  const f=calculate('outcome.recordFull',full(35000),frozen()),p=calculate('outcome.recordPartial',partial(),frozen());
  expect(f.collection).toMatchObject({reported:money(35000),goods:money(30000),shipping:money(5000)});expect(f.lines[0]).toMatchObject({delivered:3,heldReturnRequired:0});
  expect(p.collection.reported).toEqual(money(25000));expect(p.lines[0]).toMatchObject({delivered:2,heldReturnRequired:1});expect(p.returnRequired).toBe(true);
 });
 it('distinguishes paid refusal, explicit unpaid shipping and no answer',()=>{
  const paid=calculate('outcome.recordRefusal',{...full(5000),shippingPayment:'collected'},frozen()),unpaid=calculate('outcome.recordRefusal',{...full(0),shippingPayment:'refused'},frozen()),no=calculate('outcome.recordNoAnswer',target,frozen());
  expect(paid.collection).toMatchObject({reported:money(5000),goods:money(0),shipping:money(5000),unpaidShipping:money(0)});
  expect(unpaid.collection).toMatchObject({reported:money(0),shipping:money(0),unpaidShipping:money(5000),shippingStatus:'explicitly-unpaid'});
  expect(no.collection).toMatchObject({reported:null,shipping:money(0),unpaidShipping:money(0),shippingStatus:'not-attempted'});expect(no.lines[0]?.heldReturnRequired).toBe(3);
  expect(()=>calculate('outcome.recordRefusal',full(5000),frozen())).toThrow('حدّد');
 });
 it('rejects unpermitted splitting, fractional/out-of-range quantities and all-or-none partial',()=>{
  expect(()=>calculate('outcome.recordPartial',partial(),frozen({...source,splittingAllowed:false}))).toThrow('لا يسمح');
  for(const quantity of [-1,0,1.5,3,4,1000001])expect(()=>calculate('outcome.recordPartial',partial(quantity),frozen())).toThrow();
 });
 it('requires exact matching currency, integer safe amounts and no arbitrary under/overpayment',()=>{
  for(const amount of [-1,24999,25001,25000.1,Number.MAX_SAFE_INTEGER+1])expect(()=>calculate('outcome.recordPartial',partial(2,amount),frozen())).toThrow();
  expect(()=>calculate('outcome.recordFull',{...target,reportedCollection:{...money(35000),currency:'USD'} as unknown as components['schemas']['OutcomeMoney']},frozen())).toThrow();
  expect(()=>calculate('outcome.recordFull',full(35000),frozen({...source,lines:[{...source.lines[0]!,unitDue:{amountMinor:10000,currency:'USD',exponent:2} as unknown as components['schemas']['OutcomeMoney']}]}))).toThrow();
 });
 it('uses exact prepaid allocations per line, including zero, with no invented deposits',()=>{
  const s={...source,lines:[{...source.lines[0]!,sourceLineId:'prepaid',quantity:1,unitDue:money(0)},{...source.lines[0]!,sourceLineId:'remaining',quantity:2,unitDue:money(6500)}],shippingDue:money(0),totalDue:money(13000)};
  const p={...full(6500),pieces:[{sourceLineId:'prepaid',delivered:1},{sourceLineId:'remaining',delivered:1}]};
  const result=calculate('outcome.recordPartial',p,frozen(s));expect(result.collection).toMatchObject({reported:money(6500),shippingStatus:'not-due'});expect(result.lines.map(l=>l.delivered)).toEqual([1,1]);
  expect(calculate('outcome.recordFull',full(0),frozen({...source,lines:[{...source.lines[0]!,unitDue:money(0)}],shippingDue:money(0),totalDue:money(0)})).collection.reported).toEqual(money(0));
  expect(()=>calculate('outcome.recordPartial',{...p,pieces:[p.pieces[0]!,p.pieces[0]!]},frozen(s))).toThrow('بند');
  expect(()=>calculate('outcome.recordPartial',{...p,pieces:[p.pieces[0]!]},frozen(s))).toThrow('بند');
 });
 it('deducts prior shipping once and never re-delivers a rejected partial remainder',()=>{
  expect(calculate('outcome.recordFull',full(30000),frozen(source,5000)).collection.shipping).toEqual(money(0));
  expect(()=>calculate('outcome.recordFull',full(35000),frozen(source,5000))).toThrow('المطلوب');
  expect(()=>calculate('outcome.recordFull',full(35000),{...frozen(),previousDeliveredPieces:1} as Frozen)).toThrow('للإرجاع');
  expect(()=>calculate('outcome.recordRefusal',{...full(0),shippingPayment:'refused'},frozen(source,5000))).toThrow('لا توجد');
 });
 it('rejects unsupported overflow allocation rather than rounding',()=>{
  expect(()=>calculate('outcome.recordFull',full(Number.MAX_SAFE_INTEGER),frozen({...source,lines:[{...source.lines[0]!,unitDue:money(Number.MAX_SAFE_INTEGER)}],totalDue:money(Number.MAX_SAFE_INTEGER)}))).toThrow('exact sum');
  expect(calculate('outcome.recordFull',full(Number.MAX_SAFE_INTEGER),frozen({...source,lines:[{...source.lines[0]!,quantity:1,unitDue:money(Number.MAX_SAFE_INTEGER)}],shippingDue:money(0),totalDue:money(Number.MAX_SAFE_INTEGER)})).collection.reported?.amountMinor).toBe(Number.MAX_SAFE_INTEGER);
 });
 it('keeps B2C simple optional collection and forbids piece and shipping workflows',()=>{
  const personal:Frozen={kind:'personal',collection:null};
  expect(calculate('outcome.recordFull',target,personal)).toMatchObject({lines:[],returnRequired:false,collection:{reported:null}});
  expect(calculate('outcome.recordFull',full(12000),{kind:'personal',collection:money(12000)}).collection.reported).toEqual(money(12000));
  expect(()=>calculate('outcome.recordFull',full(11999),{kind:'personal',collection:money(12000)})).toThrow();
  expect(()=>calculate('outcome.recordPartial',partial(),personal)).toThrow('المستقل');
  expect(()=>calculate('outcome.recordRefusal',{...target,shippingPayment:'refused'},personal)).toThrow('المستقل');
  expect(()=>calculate('outcome.recordRefusal',full(10),personal)).toThrow('لا يوجد');
  expect(calculate('outcome.recordNoAnswer',target,personal)).toMatchObject({returnRequired:false,collection:{shippingStatus:'not-applicable'}});
 });
 it('keeps no-answer closed to collection, shipping refusal and fabricated arrivals',()=>{
  for(const extra of [{reportedCollection:money(0)},{shippingPayment:'refused'},{arrivalAt:new Date().toISOString()},{callCount:3}])expect(outcomeConforms('NoAnswer',{...target,...extra})).toBe(false);
 });
});
