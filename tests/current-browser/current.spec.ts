import { test,expect } from '@playwright/test';
import fs from 'node:fs/promises';
const fixture='http://127.0.0.1:3016';
test.afterAll(async({request})=>{expect((await request.post(fixture+'/__fixture/cleanup')).ok()).toBe(true);});
test('explicit select → heading → arrival through real API, delayed plan, contact separation and lost response recovery',async({page,context,request})=>{
 const seed=await (await request.get(fixture+'/__fixture/setup')).json();
 await page.addInitScript((device:string)=>{localStorage.setItem('tawsel:device-id',device);Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){throw new Error('No GPS permitted');},watchPosition(){throw new Error('No GPS permitted');}}});},seed.deviceId);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/rounds/current?kind=personal');await expect(page.getByRole('button',{name:'اتجه للعميل',exact:true})).toBeEnabled();
 // Native phone/message/navigation handoff itself is intentionally intercepted;
 // actual clicks must remain pure links and emit no application mutation.
 await page.evaluate(()=>document.addEventListener('click',e=>{const anchor=(e.target as Element).closest('a');if(anchor&&(anchor.href.startsWith('tel:')||anchor.target==='_blank'))e.preventDefault();},true));
 const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/'))posts.push(r.url());});
 for(const name of ['اتصال','واتساب','الاتجاهات'])await page.getByRole('link',{name,exact:true}).click();
 expect(posts).toEqual([]);const before=await (await request.get(fixture+'/__fixture/state')).json();expect(before.history).toHaveLength(0);expect(before.origins).toHaveLength(0);expect(before.snapshot.currentActivity).toBeNull();
 await page.getByLabel('اختيار العميل').selectOption(seed.taskIds[1]);expect((await (await request.get(fixture+'/__fixture/state')).json()).history).toHaveLength(0);
 await request.post(fixture+'/__fixture/delay');
 await page.getByRole('button',{name:'اتجه للعميل',exact:true}).focus();await page.keyboard.press('Enter');
 await expect(page.getByText('متجه للعميل',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'وصلت',exact:true})).toBeEnabled();await expect(page.getByRole('heading',{name:'المحطة الحالية',exact:true})).toBeFocused();
 await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'output/playwright/phase-16-heading-mobile.png',fullPage:true});
 const other=await context.browser()!.newContext({baseURL:'http://localhost:5178',locale:'ar-EG',viewport:{width:390,height:844}}),otherPage=await other.newPage();await otherPage.goto('/rounds/current?kind=personal');await expect(otherPage.getByText('الجولة تعمل على جهاز آخر',{exact:true})).toBeVisible();await expect(otherPage.getByRole('button',{name:'وصلت',exact:true})).toBeDisabled();await other.close();
 await request.post(fixture+'/__fixture/release');await page.reload();await expect(page.getByText('متجه للعميل',{exact:true})).toBeVisible();
 const heading=await (await request.get(fixture+'/__fixture/state')).json();expect(heading.snapshot.currentActivity.taskId).toBe(seed.taskIds[1]);expect(heading.snapshot.planning.updating).toBe(false);expect(heading.snapshot.nextSuggestion.taskId).not.toBe(seed.taskIds[1]);expect(heading.origins).toHaveLength(0);
 // Deliver the command to the real server, then discard its committed response.
 await page.route('**/api/v1/current/arrival?kind=personal',async route=>{const response=await route.fetch();expect(response.status()).toBe(200);await route.abort('failed');});
 await page.getByRole('button',{name:'وصلت',exact:true}).tap();await expect(page.getByText('إجراء ينتظر التأكيد',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'التحقق وإعادة المحاولة'})).toBeEnabled();
 const committed=await (await request.get(fixture+'/__fixture/state')).json();expect(committed.snapshot.currentActivity.stage).toBe('arrived');expect(committed.history).toHaveLength(2);expect(committed.origins).toHaveLength(1);
 await page.unroute('**/api/v1/current/arrival?kind=personal');await page.reload();await expect(page.getByText('الوصول مسجّل',{exact:true})).toBeVisible();await expect(page.getByText('إجراء ينتظر التأكيد',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'وصلت',exact:true})).toHaveCount(0);
 const after=await (await request.get(fixture+'/__fixture/state')).json();expect(after.history).toEqual(committed.history);expect(after.origins).toEqual(committed.origins);expect(after.actions).toHaveLength(2);expect(after.snapshot.currentActivity.arrival.observation.clock.quality).toBe('uncertain');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/playwright/phase-16-arrived-mobile.png',fullPage:true});await page.setViewportSize({width:1366,height:900});await page.screenshot({path:'output/playwright/phase-16-arrived-desktop.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
 await fs.mkdir('.local',{recursive:true});await fs.writeFile('.local/phase-16-browser-demo.json',JSON.stringify({evidence:'Real Chromium/HTTP/PostgreSQL; fixture account and controlled planner; native external handlers intercepted, no physical device/live Engine claim',seed,before,heading,committed,after},null,2));
});
