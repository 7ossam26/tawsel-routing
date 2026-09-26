import {expect,test} from 'vitest';
import {summarize,nearestRank,type Measurement} from '../../../../scripts/performance-accounting.js';
const sample:Measurement={id:'a',condition:'healthy',boundary:'view',startBeforeMs:1000,startAfterMs:1010,endMs:1100,clockUncertaintyMs:5,error:null};
test('one fast sample cannot establish a p95 target; nearest-rank uses tails',()=>{
 expect(summarize([sample],'view','healthy').verdict).toBe('insufficient-samples');
 expect(nearestRank(Array.from({length:100},(_,i)=>i+1),.95)).toBe(95);
 expect(summarize(Array.from({length:100},()=>sample),'view','healthy')).toMatchObject({verdict:'met-in-this-run',upper:{p95Ms:105},lower:{p95Ms:85}});
});
test('failures, timeouts and invalid clocks stay in attempted denominator; unhealthy conditions never hide in healthy averages',()=>{
 const samples=Array.from({length:100},()=>sample);
 samples.push({...sample,endMs:null,error:'timeout'},{...sample,endMs:900},{...sample,condition:'receiver-outage',endMs:9000,recoveryStartMs:8000},{...sample,condition:'background',endMs:8000},{...sample,condition:'offline-unsent',unsentMs:3600000});
 expect(summarize(samples,'view','healthy')).toMatchObject({attempted:102,completed:100,errors:2,timeouts:1,verdict:'incomplete-errors'});
 expect(summarize(samples,'view','receiver-outage')).toMatchObject({attempted:1,verdict:'separate-condition',recovery:{p95Ms:1005}});
 expect(summarize(samples,'view','background').attempted).toBe(1);
});
