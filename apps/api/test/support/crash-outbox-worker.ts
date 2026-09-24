import {Pool} from 'pg';
import {claimDelivery} from '../../src/outbox/queue.js';
import {runOutboxOnce} from '../../src/outbox/worker.js';
import type {OutboxConfig} from '../../src/outbox/config.js';
const pool=new Pool({connectionString:process.env.TAWSEL_CRASH_TEST_URL});
if(process.env.TAWSEL_CRASH_CONFIG){
 const raw=JSON.parse(process.env.TAWSEL_CRASH_CONFIG) as OutboxConfig&{encryptionKey:string};
 const config={...raw,encryptionKey:Buffer.from(raw.encryptionKey,'hex')};
 await runOutboxOnce(pool,config,{timeoutMs:1000,leaseMs:3000,async afterSend(c){process.stdout.write(JSON.stringify({eventId:c.eventId}),()=>process.exit(92));await new Promise(()=>{});}});
 throw new Error('Expected abrupt exit after receipt');
}
const claim=await claimDelivery(pool,200);
if(!claim)throw new Error('No committed delivery to claim');
// Abrupt exit after the claim COMMIT, with no completion or pool shutdown.
process.stdout.write(JSON.stringify({eventId:claim.eventId,attemptId:claim.attemptId}),()=>process.exit(91));
