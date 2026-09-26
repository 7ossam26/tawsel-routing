import {test,expect,type Page,type BrowserContext} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import type {components} from '@tawsel/api-client';
import {intakeClient} from '@tawsel/api-client/intake';
import {driveSourceTasks} from '../erp-conformance/source-driver.js';
type S=components['schemas'];
test.afterAll(async()=>{
 // Windows terminates Playwright web-server trees without POSIX shutdown hooks.
 // Ask this private harness to dispose only its own databases/users first.
 await writeFile('.local/phase-27-browser.stop','stop');
 await expect.poll(()=>existsSync('.local/phase-27-browser.json'),{timeout:25000}).toBe(false);
});
const readConfig=async()=>JSON.parse(await readFile('.local/phase-27-browser.json','utf8')) as {users:{username:string;subject:string}[];password:string;companyCode:string;tenantId:string;integrationId:string;serviceToken:string};
const nativeState=(page:Page)=>page.evaluate(async()=>{const r=await fetch('/native/state');return r.json() as Promise<{commands:{action_id:string;status:string;envelope:{operationId:string}}[];records:{kind:string;external_id:string;status:string;desired:Record<string,unknown>}[]}>;});
async function save(page:Page,button:string,op:string){const before=(await nativeState(page)).commands.length;await page.getByRole('button',{name:button,exact:true}).click();await expect.poll(async()=>(await nativeState(page)).commands.length).toBe(before+1);await expect.poll(async()=>(await nativeState(page)).commands[0]!.status,{timeout:20000}).toBe('accepted');expect((await nativeState(page)).commands[0]!.envelope.operationId).toBe(op);await expect(page.getByText('قبله توصيل.',{exact:true})).toBeVisible();}
async function saveWithLostAcknowledgement(page:Page){
 const before=(await nativeState(page)).commands.length;let original='';
 await page.route('**/native/commands',async route=>{
  original=(route.request().postDataJSON() as {actionId:string}).actionId;
  const committed=await route.fetch();expect(committed.status()).toBe(202);
  await route.abort('failed'); // Actual source COMMIT happened; browser gets no acknowledgement.
 },{times:1});
 await page.getByRole('button',{name:'حفظ وإرسال الشحنة',exact:true}).click();
 await expect(page.getByText('تعذر الاتصال. لم تتأكد النتيجة؛ حاول لاحقًا.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'استعادة الطلب المحفوظ'}).click();
 await expect(page.getByText('قبله توصيل.',{exact:true})).toBeVisible();
 const after=await nativeState(page);expect(after.commands).toHaveLength(before+1);expect(after.commands[0]).toMatchObject({action_id:original,status:'accepted'});
 await expect(page.getByRole('button',{name:'استعادة الطلب المحفوظ'})).toHaveCount(0);
 await page.getByRole('button',{name:'إلغاء',exact:true}).click(); // Close the recovered editor; the accepted source remains.
}
function driverFetch(context:BrowserContext):typeof fetch{return async(input,init)=>{const r=await context.request.fetch(new URL(String(input),'http://localhost:5173').href,{method:init?.method??'GET',headers:{...Object.fromEntries(new Headers(init?.headers)),origin:'http://localhost:5173'},...(init?.body?{data:String(init.body)}:{})});return new Response(await r.body(),{status:r.status(),headers:r.headers()});};}
test('B: actual Keycloak native administration, preparation/receipt, departed denial, physical subset and compatible new cycle',async({page,browser})=>{
 const c=await readConfig();await page.goto('/');await expect(page.getByText('ERP تجريبي خاص',{exact:true})).toBeVisible();await page.getByRole('link',{name:'دخول موظف ERP'}).click();await page.locator('#username').fill(c.users[0]!.username);await page.locator('#password').fill(c.password);await page.locator('#kc-login').click();await expect(page.getByRole('heading',{name:'مصدر الشحنات'})).toBeVisible();
 await page.getByRole('tab',{name:'المستخدمون والفروع'}).click();await page.getByLabel('مرجع المصدر',{exact:true}).fill('cairo');await page.getByLabel('الاسم',{exact:true}).fill('القاهرة');await save(page,'حفظ وإرسال التعديل','branch.provision');
 await page.getByLabel('نوع التعديل').selectOption('role');await page.getByLabel('مرجع المصدر',{exact:true}).fill('driver-role');await page.getByLabel('الاسم',{exact:true}).fill('مندوب');await save(page,'حفظ وإرسال التعديل','role.defineCapabilities');
 await page.getByLabel('نوع التعديل').selectOption('user');await page.getByLabel('مرجع المصدر',{exact:true}).fill('driver');await page.getByLabel('معرف المستخدم في جهة الهوية').fill(c.users[1]!.subject);await page.getByLabel('دور المستخدم').selectOption('driver-role');await page.getByLabel('فرع المستخدم').selectOption('cairo');await save(page,'حفظ وإرسال التعديل','user.provision');
 await page.getByRole('button',{name:'فحص جاهزية الحساب'}).click();await expect.poll(async()=>{await page.getByRole('button',{name:'فحص جاهزية الحساب'}).click();return page.getByText('الحساب جاهز لدى جهة الهوية',{exact:true}).count();},{timeout:20000}).toBe(1);
 await page.getByLabel('نوع التعديل').selectOption('driver');await page.getByLabel('مرجع مستخدم ERP').fill('driver');await save(page,'حفظ وإرسال التعديل','driver.provisionReference');
 const driverContext=await browser.newContext(),driverPage=await driverContext.newPage();try{
  await driverPage.goto('http://localhost:5173/login');const login=await driverPage.evaluate(async code=>{const b=await(await fetch('/api/session/bootstrap')).json();return(await fetch('/api/session/login',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':b.csrfToken},body:JSON.stringify({kind:'company',companyCode:code})})).json();},c.companyCode);
  await driverPage.goto(login.authorizationUrl);await driverPage.locator('#username').fill(c.users[1]!.username);await driverPage.locator('#password').fill(c.password);await driverPage.locator('#kc-login').click();await expect(driverPage).toHaveURL(/\/account\?kind=company/);
  const fetcher=driverFetch(driverContext),access=async()=>{const r=await fetcher('/api/session/context?kind=company');return await r.json() as S['SessionContext'];};
  await page.getByLabel('نوع التعديل').selectOption('exceptions');await page.getByLabel('استثناء المستخدم').selectOption('deny');await save(page,'حفظ وإرسال التعديل','user.setCapabilityExceptions');expect((await access()).access.effectiveCapabilities).not.toContain('execution.own');
  await page.getByLabel('استثناء المستخدم').selectOption('inherit');await save(page,'حفظ وإرسال التعديل','user.setCapabilityExceptions');expect((await access()).access.effectiveCapabilities).toContain('execution.own');
  await page.screenshot({path:'output/playwright/phase-27-native-admin.png',fullPage:true});
  await page.getByRole('tab',{name:'الشحنات',exact:true}).click();
  for(const id of ['demo/one','demo-two']){await page.getByRole('button',{name:'شحنة جديدة',exact:true}).click();await page.getByLabel('مرجع الشحنة',{exact:true}).fill(id);await page.getByLabel('فرع الإرسال',{exact:true}).selectOption('cairo');await page.getByLabel('اسم المستلم',{exact:true}).fill('عميل الاختبار');await page.getByLabel('الهاتف',{exact:true}).fill('01012345678');await page.getByLabel('راجعت نقطة التسليم وأؤكدها').check();if(id==='demo/one')await saveWithLostAcknowledgement(page);else await save(page,'حفظ وإرسال الشحنة','intake.submitSnapshot');}
  await page.getByRole('button',{name:'تحديث حالة توصيل'}).click();for(const id of ['demo/one','demo-two'])await page.getByRole('checkbox',{name:`اختيار ${id}`,exact:true}).check();await page.getByLabel('المندوب',{exact:true}).selectOption('driver');await save(page,'إرسال التجهيز','intake.prepare');
  const intake=intakeClient('http://127.0.0.1:3001',c.serviceToken);expect((await intake.get('demo/one')).body).toMatchObject({state:'prepared',receivedAt:null,planningEligible:false});
  await page.getByRole('button',{name:'تحديث حالة توصيل'}).click();for(const id of ['demo/one','demo-two'])await page.getByRole('checkbox',{name:`اختيار ${id}`,exact:true}).check();await page.getByLabel('الإجراء',{exact:true}).selectOption('receive');await expect(page.getByRole('button',{name:'تأكيد الاستلام والإسناد'})).toBeDisabled();await page.getByLabel('أؤكد استلام المندوب للشحنات المختارة فعلًا').check();await save(page,'تأكيد الاستلام والإسناد','assignment.receiveBatch');
  const tasks=await Promise.all(['demo/one','demo-two'].map(async id=>(await intake.get(id)).body as S['B2bTask']));const journey=await driveSourceTasks(fetcher,tasks.map(t=>t.taskId));
  await page.getByRole('button',{name:'تحديث حالة توصيل'}).click();await expect(page.getByText('غادرت الشحنة؛ تعديل الموظف غير مسموح. استلام المرتجع له إجراء منفصل.')).toHaveCount(2);await expect(page.getByRole('checkbox',{name:'اختيار demo/one'})).toBeDisabled();
  await page.screenshot({path:'output/playwright/phase-27-departed.png',fullPage:true});await page.getByRole('tab',{name:'مرتجعات المندوب'}).click();await page.getByLabel('مندوب المرتجعات').selectOption(journey.driverId);await page.getByLabel('فرع الاستلام الأصلي').selectOption(journey.request.sourceBranchId);await page.getByRole('button',{name:'عرض وتحديث المرتجعات'}).click();
  await page.getByLabel('القطع الآن — demo/one',{exact:true}).fill('1');await page.getByLabel('أؤكد استلام هذه القطع فعلًا').check();await save(page,'تأكيد القطع المستلمة فقط','return.confirmSubsetReceipt');await page.getByRole('button',{name:'عرض وتحديث المرتجعات'}).click();
  await expect(page.getByText('مستلم: 1 · معلق: 1 · مفقود: 0 · تالف: 0')).toBeVisible();await expect(page.getByText('مستلم: 0 · معلق: 3 · مفقود: 0 · تالف: 0')).toBeVisible();
  await page.screenshot({path:'output/playwright/phase-27-subset-mobile.png',fullPage:true});await page.setViewportSize({width:1366,height:768});await page.screenshot({path:'output/playwright/phase-27-subset-desktop.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'إرسال القطع المستلمة في دورة جديدة'}).click();await page.getByLabel('راجعت نقطة التسليم وأؤكدها').check();await save(page,'حفظ وإرسال الشحنة','dispatch.createFromReceipt');const fresh=(await intake.get('demo/one')).body as S['B2bTask'];expect(fresh.dispatchCycleId).not.toBe(tasks[0]!.dispatchCycleId);expect(fresh.state).toBe('unassigned');
  await page.getByRole('tab',{name:'الشحنات',exact:true}).click();await page.getByRole('button',{name:'تحديث حالة توصيل'}).click();
  const revised=page.locator('article.native-shipment').filter({hasText:'demo/one'});await revised.locator('summary').click();await revised.getByRole('button',{name:'تعديل بيانات المصدر'}).click();await page.getByLabel('اسم المستلم',{exact:true}).fill('مستلم الدورة الجديدة');await page.getByLabel('راجعت نقطة التسليم وأؤكدها').check();await save(page,'حفظ وإرسال الشحنة','intake.submitSnapshot');
  await page.getByRole('button',{name:'تحديث حالة توصيل'}).click();await revised.getByRole('button',{name:'تعديل بيانات المصدر'}).click();await expect(page.getByLabel('اسم المستلم',{exact:true})).toHaveValue('مستلم الدورة الجديدة');
  await page.getByRole('tab',{name:'حالة التكامل'}).click();await expect(page.getByRole('heading',{name:'حالة المصدر والتنفيذ'})).toBeVisible();await expect.poll(async()=>{const statuses=await page.evaluate(async()=>await(await fetch('/native/projections')).json() as S['ConsumerStatus'][]);return statuses.length>0&&statuses.every(s=>s.checkpoint.appliedThrough===s.checkpoint.receivedThrough&&s.checkpoint.pendingCount===0);},{timeout:20000}).toBe(true);
  await expect(page.getByText('قبول الطلب في توصيل، واستلام الحدث في ERP، وتطبيقه ثلاث حقائق منفصلة.',{exact:true})).toBeVisible();
  await expect(page.locator('.integration-counts')).toContainText('استلمه ERP دائمًا');
  await expect(page.locator('.integration-stream').first()).toContainText('بانتظار التطبيق: 0');
  await page.screenshot({path:'output/playwright/phase-27-integration-status.png',fullPage:true});
  await writeFile('.local/phase-27-browser-evidence.json',JSON.stringify({journey,newCycle:fresh,source:await nativeState(page)},null,2));
 }finally{await driverContext.close();}
});

