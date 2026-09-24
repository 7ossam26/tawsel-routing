/** Explicit pause is permitted only before arrival. Outcomes resolve arrived
 * customers; closing a round must never synthesize an outcome or arrival. */
export function closureBlocker(stage:'heading'|'arrived'|null,action:'require-none'|'pause-heading'){
 if(stage==='arrived')return 'arrived-outcome-required';
 if(stage==='heading'&&action!=='pause-heading')return 'explicit-pause-required';
 if(stage===null&&action==='pause-heading')return 'current-changed';
 return null;
}
