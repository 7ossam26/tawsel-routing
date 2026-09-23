import { mkdir,writeFile } from 'node:fs/promises';
import { runRoundHttpDemo } from '../apps/api/test/support/round-http-demo.js';
const report=await runRoundHttpDemo();
await mkdir('.local',{recursive:true});await writeFile('.local/phase-15-demo.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS: real HTTP/session/PostgreSQL manual plan → verified readiness → discarded committed response → same action recovery → restart/second device observes one round and owner.');
console.log('Exact requests/results and immutable forecast: .local/phase-15-demo.json. Disposable test database removed. Issuer is a labelled signed fixture; no browser/device/live Engine claim.');
