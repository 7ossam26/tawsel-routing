export type Condition='healthy'|'receiver-outage'|'background'|'offline-unsent'|'saturation';
export type Measurement={id:string;condition:Condition;boundary:'view'|'erp';startBeforeMs:number;startAfterMs:number;
  endMs:number|null;clockUncertaintyMs:number;error:string|null;recoveryStartMs?:number;unsentMs?:number};
export function nearestRank(values:number[],p:number){if(!values.length)return null;return [...values].sort((a,b)=>a-b)[Math.ceil(p*values.length)-1]!;}
export function summarize(samples:Measurement[],boundary:Measurement['boundary'],condition:Condition){
 const selected=samples.filter(s=>s.boundary===boundary&&s.condition===condition);
 const valid=selected.filter(s=>s.endMs!==null&&!s.error&&Number.isFinite(s.endMs)&&Number.isFinite(s.startBeforeMs)&&Number.isFinite(s.startAfterMs)&&Number.isFinite(s.clockUncertaintyMs)&&s.clockUncertaintyMs>=0&&s.startAfterMs>=s.startBeforeMs&&s.endMs+s.clockUncertaintyMs>=s.startBeforeMs);
 const upper=valid.map(s=>Math.max(0,s.endMs!-s.startBeforeMs+s.clockUncertaintyMs));
 const lower=valid.map(s=>Math.max(0,s.endMs!-s.startAfterMs-s.clockUncertaintyMs));
 const percentiles=(values:number[])=>({p50Ms:nearestRank(values,.5),p95Ms:nearestRank(values,.95),p99Ms:nearestRank(values,.99)});
 const errors=selected.length-valid.length,p95=nearestRank(upper,.95),targetMs=boundary==='view'?3000:5000;
 return {boundary,condition,attempted:selected.length,completed:valid.length,errors,timeouts:selected.filter(s=>s.error==='timeout').length,
  upper:percentiles(upper),lower:percentiles(lower),targetMs,
  verdict:condition!=='healthy'?'separate-condition':selected.length<100?'insufficient-samples':errors?'incomplete-errors':p95!==null&&p95<=targetMs?'met-in-this-run':'missed-in-this-run',
  recovery:percentiles(valid.filter(s=>s.recoveryStartMs!==undefined).map(s=>Math.max(0,s.endMs!-s.recoveryStartMs!+s.clockUncertaintyMs))),
  maxClockUncertaintyMs:selected.length?Math.max(...selected.map(s=>s.clockUncertaintyMs)):null};
}
