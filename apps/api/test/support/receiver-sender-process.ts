import {Pool} from 'pg';
import Fastify from 'fastify';
import {outboxRoutes} from '../../src/outbox/routes.js';
import {runOutboxOnce} from '../../src/outbox/worker.js';
import type {OutboxConfig} from '../../src/outbox/config.js';
const raw=JSON.parse(process.env.TAWSEL_RECEIVER_TEST_CONFIG!) as OutboxConfig&{encryptionKey:string};
const config={...raw,encryptionKey:Buffer.from(raw.encryptionKey,'hex')},pool=new Pool({connectionString:process.env.TAWSEL_RECEIVER_TEST_DATABASE});
const app=Fastify();await app.register(s=>outboxRoutes(s,pool,config));
await app.listen({host:'127.0.0.1',port:Number(process.env.TAWSEL_RECEIVER_TEST_PORT??0)});
console.log(JSON.stringify({address:app.server.address()}));
if(process.env.TAWSEL_RECEIVER_TEST_SEND==='once'){await runOutboxOnce(pool,config);await app.close();await pool.end();}
else{const stop=async()=>{await app.close();await pool.end();};process.once('SIGTERM',()=>void stop());process.once('SIGINT',()=>void stop());}
