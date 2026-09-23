/** Actual persisted state, loaded under the driver/assignment/task guards. */
export interface Facts {
 held:boolean; sameDriver:boolean; current:boolean; deferred:boolean;
 outcome:'full'|'partial'|'refused'|'no-answer'|null;
 whole:boolean; dependency:boolean; future:boolean; located:boolean; remaining:number;
}
export type Blocker='not-held'|'different-driver'|'receipt-or-disposition'|'partial-or-delivered'|'current-customer'|'result-required'|'not-deferred'|'earliest-time'|'location-required'|'capacity';
export type Choice='defer'|'retry'|'activate'|'urgency';
export function denied(f:Facts,choice:Choice):Blocker|null {
 if(!f.sameDriver)return 'different-driver';
 if(!f.held)return 'not-held';
 if(f.dependency)return 'receipt-or-disposition';
 if(!f.whole||f.outcome==='full'||f.outcome==='partial')return 'partial-or-delivered';
 if(choice==='urgency')return null;
 if(f.current)return 'current-customer';
 if(choice==='defer')return null;
 if(choice==='retry'&&!f.outcome)return 'result-required';
 if(choice==='activate'&&(!f.deferred||f.outcome))return 'not-deferred';
 if(f.future)return 'earliest-time';
 if(!f.located)return 'location-required';
 if(f.remaining>=50)return 'capacity';
 return null;
}
