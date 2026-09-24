import {receiverPool} from '../../src/database.js';
import {saveSource,runSourceOnce,type SourceSubmission} from '../../src/source.js';
import type {ReceiverConfig} from '../../src/config.js';
const pool=receiverPool(),config=JSON.parse(process.env.MOCK_ERP_TEST_CONFIG!) as ReceiverConfig;
if(process.env.MOCK_ERP_TEST_SUBMISSION){
 await saveSource(pool,config,'staff',JSON.parse(process.env.MOCK_ERP_TEST_SUBMISSION) as SourceSubmission);
 process.exit(76);
}
await runSourceOnce(pool,config,{afterSend:async()=>{process.exit(77);}});
throw new Error('Expected a pending source command');
