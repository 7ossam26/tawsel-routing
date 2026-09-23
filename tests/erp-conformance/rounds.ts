import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { components } from '../../packages/api-client/src/schema.js';

/** Public protocol assertions only. Never imports the application or its DB. */
export function assertRoundStart(value:components['schemas']['RoundStartResult']){
 assert.equal(value.workday.state,'open');assert.equal(value.round.state,'active');
 assert.equal(value.round.workdayId,value.workday.workdayId);assert.equal(value.round.driverId,value.workday.driverId);
 assert.ok(Date.parse(value.round.startedAt)>=Date.parse(value.workday.openedAt));
 assert.ok(value.round.owner.generation>=1);assert.equal(value.round.currentActivity,null);
 assert.ok(value.round.firstForecastId);assert.ok(value.round.firstWorkloadId);assert.ok(value.round.firstPlanId);
}
export function assertSameAuthority(a:components['schemas']['RoundRound'],b:components['schemas']['RoundRound']){
 assert.deepEqual(b,a,'Retry/another phone must retain round, owner and first baseline');
}
export function assertStartStatus(value:components['schemas']['RoundActionStatus']){
 if(value.status==='pending'){assert.equal('result' in value,false);return;}
 assert.equal(value.result.operationId,'round.start');assert.equal(value.actionId,value.result.receipt.actionId);assert.equal(value.status,value.result.receipt.businessStatus);
 if(value.status==='accepted'&&value.result.response)assertRoundStart(value.result.response.body as components['schemas']['RoundStartResult']);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const examples=JSON.parse(await readFile(new URL('../../contracts/examples/valid.json',import.meta.url),'utf8')) as {id:string;data:unknown}[];
 const start=examples.find(e=>e.id==='p15-start-result')!.data as components['schemas']['RoundStartResult'];assertRoundStart(start);
 for(const id of ['p15-action-accepted','p15-action-pending'])assertStartStatus(examples.find(e=>e.id===id)!.data as components['schemas']['RoundActionStatus']);
 assert.throws(()=>assertRoundStart({...start,round:{...start.round,workdayId:'wrong-day'}}));
 assert.throws(()=>assertSameAuthority(start.round,{...start.round,owner:{...start.round.owner,deviceId:'another-device'}}));
 console.log('PASS: canonical online-start/action-status public consumer assertions; no live ERP or event transport claim.');
}
