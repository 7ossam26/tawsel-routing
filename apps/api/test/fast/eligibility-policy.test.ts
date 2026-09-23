import {test,expect} from 'vitest';
import {denied,type Facts} from '../../src/eligibility/policy.js';
const held:Facts={held:true,sameDriver:true,current:false,deferred:false,outcome:'no-answer',whole:true,dependency:false,future:false,located:true,remaining:0};
test('untouched return-required work can retry, with no retry or call count',()=>{expect(denied(held,'retry')).toBeNull();expect(denied({...held,outcome:'refused'},'retry')).toBeNull();});
test('partial remnants cannot be deferred, retried, activated or made urgent',()=>{for(const choice of ['defer','retry','activate','urgency'] as const)expect(denied({...held,outcome:'partial',whole:false},choice)).toBe('partial-or-delivered');});
test('current, custody, future, capacity and explicit activation are distinct',()=>{
 expect(denied({...held,current:true},'defer')).toBe('current-customer');
 expect(denied({...held,current:true},'urgency')).toBeNull();
 expect(denied({...held,dependency:true},'retry')).toBe('receipt-or-disposition');
 expect(denied({...held,future:true},'retry')).toBe('earliest-time');
 expect(denied({...held,remaining:50},'retry')).toBe('capacity');
 expect(denied({...held,outcome:null},'retry')).toBe('result-required');
 expect(denied({...held,outcome:null,deferred:true},'activate')).toBeNull();
});
