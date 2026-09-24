import {readFileSync} from 'node:fs';
export type OutboxScope={tenantId:string;integrationId:string};

export interface OutboxConfig {
 encryptionKey:Buffer;
 destinations:(OutboxScope&{url:string})[];
 keys:(OutboxScope&{keyId:string;secret:string})[];
 testLoopback?:boolean;
}
/** Secrets and per-source exact destinations are operator-provisioned out of
 * band. Public commands select them; they cannot read or choose raw secrets. */
export function loadOutboxConfig(env:NodeJS.ProcessEnv=process.env):OutboxConfig|undefined{
 if(!env.TAWSEL_OUTBOX_CONFIG_FILE)return;
 let c:Record<string,unknown>;
 try{c=JSON.parse(readFileSync(env.TAWSEL_OUTBOX_CONFIG_FILE,'utf8')) as Record<string,unknown>;}catch{throw new Error('Cannot read outbox operator configuration');}
 if(typeof c.encryptionKey!=='string'||!/^[a-f0-9]{64}$/.test(c.encryptionKey)||!Array.isArray(c.destinations)||!Array.isArray(c.keys))throw new Error('Invalid outbox operator configuration');
 if(c.testLoopback===true&&env.NODE_ENV==='production')throw new Error('Isolated loopback mode is forbidden in production');
 const config={encryptionKey:Buffer.from(c.encryptionKey,'hex'),destinations:c.destinations,keys:c.keys,testLoopback:c.testLoopback===true} as OutboxConfig;
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
 for(const d of [...config.destinations,...config.keys])if(!uuid.test(d.tenantId)||!uuid.test(d.integrationId))throw new Error('Invalid outbox operator scope');
 for(const d of config.destinations)if(typeof d.url!=='string'||d.url.length>2048)throw new Error('Invalid outbox destination');
 for(const k of config.keys)if(!/^[a-zA-Z0-9_-]{1,64}$/.test(k.keyId)||!/^[a-f0-9]{64}$/.test(k.secret)||!k.tenantId||!k.integrationId)throw new Error('Invalid scoped signing key');
 const ids=config.keys.map(k=>`${k.tenantId}/${k.integrationId}/${k.keyId}`);
 if(new Set(ids).size!==ids.length)throw new Error('Duplicate scoped signing key');
 return config;
}
