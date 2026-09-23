import { expect, test } from 'vitest';
import { runRoundHttpDemo } from '../support/round-http-demo.js';
test('P15 real HTTP/session/client: offline request, lost start response, restart and another phone recover one authoritative round',async()=>{
 const report=await runRoundHttpDemo();expect(report.rounds).toHaveLength(1);expect(report.current.round!.currentActivity).toBeNull();
},30_000);
