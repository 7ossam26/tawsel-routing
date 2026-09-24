import {test,expect} from 'vitest';
import {closureBlocker} from '../../src/closure/policy.js';
import {closureConforms} from '../../src/closure/models.js';
import {command} from '../support/planning-fixture.js';
test('closure requires explicit current expectations and never offers an arrived pause',()=>{
 const id='11111111-1111-4111-8111-111111111111';
 const c=command('workday.end',{workdayId:id,roundId:id,expectedActiveRoundId:id,expectedActivityRevision:1,expectedCurrentAttemptId:id,currentAction:'pause-heading'});
 expect(closureConforms('EndDayCommand',c)).toBe(true);
 for(const property of ['expectedActiveRoundId','expectedActivityRevision','expectedCurrentAttemptId','currentAction']){const broken=structuredClone(c);delete broken.payload[property];expect(closureConforms('EndDayCommand',broken),property).toBe(false);}
 expect(closureConforms('EndDayCommand',{...c,payload:{...c.payload,settled:true}})).toBe(false);
 expect(closureBlocker('heading','require-none')).toBe('explicit-pause-required');
 expect(closureBlocker('heading','pause-heading')).toBe(null);
 expect(closureBlocker('arrived','pause-heading')).toBe('arrived-outcome-required');
 expect(closureBlocker('arrived','require-none')).toBe('arrived-outcome-required');
 expect(closureBlocker(null,'pause-heading')).toBe('current-changed');
 expect(closureBlocker(null,'require-none')).toBe(null);
});
