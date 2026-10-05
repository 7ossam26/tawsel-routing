// @vitest-environment jsdom
import {cleanup,render,screen,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,describe,expect,it,vi} from 'vitest';
import type {components} from '@tawsel/api-client';
import {Administration,SnapshotForm,type RecordRow} from '../../../mock-erp/ui/source-forms';

type S=components['schemas'];
const record=(kind:string,id:string,desired:Record<string,unknown>):RecordRow=>({kind,external_id:id,revision:1,desired,status:'accepted',result:null,last_error:null});
const branch=record('branch','cairo',{name:'القاهرة'});
const snapshot=(destination:S['IndependentDestination']):S['B2bSourceSnapshot']=>({externalId:'existing',sourceDispatchCycleId:'kept-cycle',sourceRevision:4,expectedSourceRevision:3,sourceBranchExternalId:'cairo',recipientName:'عميل موجود',recipientPhone:'01012345678',destination,splittingAllowed:true,allocation:'exact-outstanding-per-unit',lines:[{sourceLineId:'kept-line',description:'قطع',quantity:3,unitDue:{amountMinor:10000,currency:'EGP',exponent:2}}],shippingDue:{amountMinor:5000,currency:'EGP',exponent:2},totalDue:{amountMinor:35000,currency:'EGP',exponent:2},priority:'ordinary'});
const task=(source:S['B2bSourceSnapshot'])=>({externalId:source.externalId,sourceDispatchCycleId:source.sourceDispatchCycleId,sourceRevision:source.sourceRevision,snapshot:source} as S['B2bTask']);
const saveButton=()=>screen.getByRole('button',{name:'حفظ وإرسال الشحنة'}) as HTMLButtonElement;
afterEach(()=>{cleanup();vi.restoreAllMocks();});

describe('native Mock ERP driver vehicle selection',()=>{
 it.each(['motorcycle','car'])('sends the explicitly selected %s and offers only supported vehicles',async profile=>{
  const user=userEvent.setup(),submit=vi.fn().mockResolvedValue(undefined);
  render(<Administration rows={[]} submit={submit}/>);
  await user.selectOptions(screen.getByLabelText('نوع التعديل'),'driver');
  const selector=screen.getByLabelText('وسيلة حركة المندوب') as HTMLSelectElement;
  expect(selector.value).toBe('motorcycle');
  expect(within(selector).getAllByRole('option').map(option=>(option as HTMLOptionElement).value)).toEqual(['','motorcycle','car']);
  await user.type(screen.getByLabelText('مرجع المصدر'),'pilot-driver');
  await user.type(screen.getByLabelText('مرجع مستخدم ERP'),'pilot-user');
  await user.selectOptions(selector,profile);
  await user.click(screen.getByRole('button',{name:'حفظ وإرسال التعديل'}));
  expect(submit).toHaveBeenCalledWith('driver.provisionReference',expect.objectContaining({profile,userExternalId:'pilot-user'}),['driver/pilot-driver']);
 });
 it.each(['car','motorcycle'])('restores an existing %s without replacing it on refresh or ID navigation',async profile=>{
  const user=userEvent.setup(),submit=vi.fn().mockResolvedValue(undefined),rows=[record('driver','existing',{profile,sourceRevision:5,vehicleReference:'retained-vehicle'})];
  const view=render(<Administration rows={rows} submit={submit}/>);
  await user.selectOptions(screen.getByLabelText('نوع التعديل'),'driver');
  await user.type(screen.getByLabelText('مرجع المصدر'),'existing');
  expect((screen.getByLabelText('وسيلة حركة المندوب') as HTMLSelectElement).value).toBe(profile);
  const choice=profile==='car'?'motorcycle':'car';
  await user.selectOptions(screen.getByLabelText('وسيلة حركة المندوب'),choice);
  view.rerender(<Administration rows={structuredClone(rows)} submit={submit}/>);
  expect((screen.getByLabelText('وسيلة حركة المندوب') as HTMLSelectElement).value).toBe(choice);
  await user.clear(screen.getByLabelText('مرجع المصدر'));await user.type(screen.getByLabelText('مرجع المصدر'),'new');
  expect((screen.getByLabelText('وسيلة حركة المندوب') as HTMLSelectElement).value).toBe('motorcycle');
  await user.clear(screen.getByLabelText('مرجع المصدر'));await user.type(screen.getByLabelText('مرجع المصدر'),'existing');
  expect((screen.getByLabelText('وسيلة حركة المندوب') as HTMLSelectElement).value).toBe(choice);
  await user.type(screen.getByLabelText('مرجع مستخدم ERP'),'pilot-user');
  await user.click(screen.getByRole('button',{name:'حفظ وإرسال التعديل'}));
  expect(submit).toHaveBeenCalledWith('driver.provisionReference',expect.objectContaining({profile:choice,sourceRevision:6,vehicleReference:'retained-vehicle'}),['driver/existing']);
 });
 it('requires an explicit new choice for a saved unsupported vehicle',async()=>{
  const user=userEvent.setup(),submit=vi.fn().mockResolvedValue(undefined);
  render(<Administration rows={[record('driver','legacy',{profile:'bicycle'})]} submit={submit}/>);
  await user.selectOptions(screen.getByLabelText('نوع التعديل'),'driver');
  await user.type(screen.getByLabelText('مرجع المصدر'),'legacy');await user.type(screen.getByLabelText('مرجع مستخدم ERP'),'user');
  expect((screen.getByLabelText('وسيلة حركة المندوب') as HTMLSelectElement).value).toBe('');
  expect((screen.getByRole('button',{name:'حفظ وإرسال التعديل'}) as HTMLButtonElement).disabled).toBe(true);
  expect(submit).not.toHaveBeenCalled();
  await user.selectOptions(screen.getByLabelText('وسيلة حركة المندوب'),'motorcycle');
  await user.click(screen.getByRole('button',{name:'حفظ وإرسال التعديل'}));
  expect(submit).toHaveBeenCalledWith('driver.provisionReference',expect.objectContaining({profile:'motorcycle'}),['driver/legacy']);
 });
});

describe('native Mock ERP shipment destinations',()=>{
 async function fillNew(){const user=userEvent.setup();await user.type(screen.getByLabelText('مرجع الشحنة'),'new');await user.selectOptions(screen.getByLabelText('فرع الإرسال'),'cairo');await user.type(screen.getByLabelText('اسم المستلم'),'عميل');await user.type(screen.getByLabelText('الهاتف'),'01012345678');return user;}
 it('saves an address-only shipment without inventing coordinates or claiming pin confirmation',async()=>{
  const submit=vi.fn().mockResolvedValue(undefined),close=vi.fn();render(<SnapshotForm task={null} rows={[branch]} submit={submit} close={close}/>);
  const user=await fillNew();
  expect((screen.getByLabelText('طريقة تحديد العنوان') as HTMLSelectElement).value).toBe('address');
  expect(saveButton().disabled).toBe(true);expect(screen.queryByLabelText('خط العرض')).toBeNull();
  await user.type(screen.getByLabelText('العنوان المكتوب'),'  ١٢ شارع طلعت حرب، القاهرة  ');
  await user.click(saveButton());
  expect(submit).toHaveBeenCalledWith('intake.submitSnapshot',expect.objectContaining({destination:{kind:'address',addressText:'١٢ شارع طلعت حرب، القاهرة'}}),['shipment/new']);
  expect(close).toHaveBeenCalledOnce();
 });
 it('requires valid coordinates and explicit review for a confirmed pin, retaining optional address text',async()=>{
  const submit=vi.fn().mockResolvedValue(undefined);render(<SnapshotForm task={null} rows={[branch]} submit={submit} close={vi.fn()}/>);
  const user=await fillNew();await user.selectOptions(screen.getByLabelText('طريقة تحديد العنوان'),'confirmed-pin');
  await user.type(screen.getByLabelText('العنوان المكتوب (اختياري)'),'شارع طلعت حرب');
  await user.type(screen.getByLabelText('خط العرض'),'30.05');await user.type(screen.getByLabelText('خط الطول'),'31.24');
  expect(saveButton().disabled).toBe(true);await user.click(screen.getByLabelText('راجعت نقطة التسليم وأؤكدها'));
  expect(saveButton().disabled).toBe(false);
  await user.clear(screen.getByLabelText('خط الطول'));await user.type(screen.getByLabelText('خط الطول'),'181');
  await user.click(screen.getByLabelText('راجعت نقطة التسليم وأؤكدها'));expect(saveButton().disabled).toBe(true);
  await user.clear(screen.getByLabelText('خط الطول'));await user.type(screen.getByLabelText('خط الطول'),'31.24');
  expect(saveButton().disabled).toBe(true);await user.click(screen.getByLabelText('راجعت نقطة التسليم وأؤكدها'));
  await user.click(saveButton());
  expect(submit).toHaveBeenCalledWith('intake.submitSnapshot',expect.objectContaining({destination:{kind:'confirmed-pin',coordinates:{latitude:30.05,longitude:31.24},addressText:'شارع طلعت حرب'}}),['shipment/new']);
 });
 it('preserves address-only edits and dispatch identity from the current task even without a local source row',async()=>{
  const source=snapshot({kind:'address',addressText:'عنوان المصدر'}),submit=vi.fn().mockResolvedValue(undefined);
  render(<SnapshotForm task={task(source)} rows={[branch]} submit={submit} close={vi.fn()}/>);
  expect((screen.getByLabelText('العنوان المكتوب') as HTMLInputElement).value).toBe('عنوان المصدر');
  const user=userEvent.setup();await user.clear(screen.getByLabelText('اسم المستلم'));await user.type(screen.getByLabelText('اسم المستلم'),'اسم جديد');await user.click(saveButton());
  expect(submit).toHaveBeenCalledWith('intake.submitSnapshot',expect.objectContaining({externalId:'existing',sourceDispatchCycleId:'kept-cycle',sourceRevision:5,expectedSourceRevision:4,destination:source.destination,lines:[expect.objectContaining({sourceLineId:'kept-line'})]}),['shipment/existing']);
 });
 it('keeps the authoritative connector snapshot when a local shipment record contains only assignment data',async()=>{
  const source=snapshot({kind:'address',addressText:'عنوان من الموصل الخارجي'}),submit=vi.fn().mockResolvedValue(undefined);
  source.recipientName='مستلم الموصل';source.recipientPhone='01098765432';
  source.lines=[{sourceLineId:'connector-line',description:'كتاب',quantity:7,unitDue:{amountMinor:13579,currency:'EGP',exponent:2}}];
  source.shippingDue={amountMinor:2468,currency:'EGP',exponent:2};source.totalDue={amountMinor:97521,currency:'EGP',exponent:2};
  const assignment=record('shipment','existing',{driverExternalId:'pilot-driver',items:[{externalId:'existing'}],receiptAsserted:true});
  render(<SnapshotForm task={task(source)} rows={[branch,assignment]} submit={submit} close={vi.fn()}/>);
  expect((screen.getByLabelText('العنوان المكتوب') as HTMLInputElement).value).toBe(source.destination.addressText);
  expect((screen.getByLabelText('اسم المستلم') as HTMLInputElement).value).toBe(source.recipientName);
  expect((screen.getByLabelText('الهاتف') as HTMLInputElement).value).toBe(source.recipientPhone);
  expect((screen.getByLabelText('عدد القطع') as HTMLInputElement).value).toBe('7');
  expect((screen.getByLabelText('المستحق لكل قطعة — قرش') as HTMLInputElement).value).toBe('13579');
  expect((screen.getByLabelText('الشحن المستحق — قرش') as HTMLInputElement).value).toBe('2468');
  await userEvent.setup().click(saveButton());
  expect(submit).toHaveBeenCalledWith('intake.submitSnapshot',expect.objectContaining({recipientName:source.recipientName,recipientPhone:source.recipientPhone,destination:source.destination,lines:source.lines,shippingDue:source.shippingDue,totalDue:source.totalDue,sourceDispatchCycleId:'kept-cycle',sourceRevision:5,expectedSourceRevision:4}),['shipment/existing']);
 });
 it('does not treat assignment-only local data as a redispatch snapshot',()=>{
  render(<SnapshotForm task={null} rows={[branch,record('shipment','existing',{driverExternalId:'pilot-driver',items:[{externalId:'existing'}],recipientName:'assignment annotation'})]} previous={{externalId:'existing',cycleId:'original-cycle',sourceRevision:4,quantity:1}} submit={vi.fn()} close={vi.fn()}/>);
  expect((screen.getByLabelText('اسم المستلم') as HTMLInputElement).value).toBe('');
  expect((screen.getByLabelText('العنوان المكتوب') as HTMLInputElement).value).toBe('');
  expect(saveButton().disabled).toBe(true);
 });
 it('preserves an existing pin and optional written address while requiring a fresh review after mode changes',async()=>{
  const source=snapshot({kind:'confirmed-pin',coordinates:{latitude:30.05,longitude:31.24},addressText:'عنوان الدبوس'}),submit=vi.fn().mockResolvedValue(undefined);
  render(<SnapshotForm task={task(source)} rows={[branch]} submit={submit} close={vi.fn()}/>);
  expect((screen.getByLabelText('خط العرض') as HTMLInputElement).value).toBe('30.05');expect(saveButton().disabled).toBe(true);
  const user=userEvent.setup();await user.click(screen.getByLabelText('راجعت نقطة التسليم وأؤكدها'));
  await user.selectOptions(screen.getByLabelText('طريقة تحديد العنوان'),'address');
  expect((screen.getByLabelText('العنوان المكتوب') as HTMLInputElement).value).toBe('عنوان الدبوس');
  await user.selectOptions(screen.getByLabelText('طريقة تحديد العنوان'),'confirmed-pin');expect(saveButton().disabled).toBe(true);
  await user.click(screen.getByLabelText('راجعت نقطة التسليم وأؤكدها'));await user.click(saveButton());
  expect(submit).toHaveBeenCalledWith('intake.submitSnapshot',expect.objectContaining({destination:source.destination}),['shipment/existing']);
 });
 it('redispatches only received quantity in a new cycle while retaining an address destination',async()=>{
  const source=snapshot({kind:'address',addressText:'عنوان إعادة الإرسال'}),submit=vi.fn().mockResolvedValue(undefined);
  render(<SnapshotForm task={null} rows={[branch,record('shipment','existing',{snapshot:source})]} previous={{externalId:'existing',cycleId:'original-cycle',sourceRevision:4,quantity:1}} submit={submit} close={vi.fn()}/>);
  expect((screen.getByLabelText('عدد القطع') as HTMLInputElement).value).toBe('1');
  await userEvent.setup().click(saveButton());await waitFor(()=>expect(submit).toHaveBeenCalledOnce());
  const [operation,payload]=submit.mock.calls[0]!;
  expect(operation).toBe('dispatch.createFromReceipt');
  expect(payload).toMatchObject({externalId:'existing',previousDispatchCycleId:'original-cycle',snapshot:{sourceRevision:5,expectedSourceRevision:4,destination:source.destination,lines:[{quantity:1,sourceLineId:'kept-line'}]}});
  expect(payload.snapshot.sourceDispatchCycleId).not.toBe('kept-cycle');
 });
});
