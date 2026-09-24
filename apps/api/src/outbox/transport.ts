import {request as httpRequest,Agent as HttpAgent} from 'node:http';
import {request as httpsRequest,Agent as HttpsAgent} from 'node:https';
import {resolveDestination,DeliveryFailure} from './destination.js';
import type {OutboxConfig} from './config.js';
import type {Claim} from './queue.js';
import {outboxConforms} from './validation.js';

export async function deliverHttp(claim:Claim,headers:Record<string,string>,config:OutboxConfig,signal:AbortSignal):Promise<number>{
 if(claim.body.byteLength>2*1024*1024)throw new DeliveryFailure('payload_too_large');
 const target=await resolveDestination(claim.url,claim,config,signal);
 signal.throwIfAborted();
 const secure=target.url.protocol==='https:',agent=secure?new HttpsAgent({keepAlive:false,maxSockets:1}):new HttpAgent({keepAlive:false,maxSockets:1});
 try{return await new Promise<number>((resolve,reject)=>{
  // Pin the checked IP for this connection; TLS still validates the original
  // hostname. No ambient proxy, redirect following, cookies, or connection reuse.
  const req=(secure?httpsRequest:httpRequest)(target.url,{method:'POST',agent,signal,family:target.family,
   lookup:(_hostname,_options,callback)=>callback(null,target.address,target.family),
   headers:{...headers,'content-type':'application/json','content-length':String(claim.body.byteLength)},maxHeaderSize:8192},response=>{
   const chunks:Buffer[]=[];let size=0;
   response.on('error',reject);
   response.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>8192){response.destroy();reject(new DeliveryFailure('invalid_acknowledgement'));}else chunks.push(chunk);});
   response.on('end',()=>{
    const status=response.statusCode??0;
    if(status<200||status>=300){reject(new DeliveryFailure(status>=300&&status<400?'redirect_denied':`http_${status}`,status));return;}
    let ack:Record<string,unknown>;try{ack=JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string,unknown>;}catch{reject(new DeliveryFailure('invalid_acknowledgement'));return;}
    if(!outboxConforms('Acknowledgement',ack)||ack.eventId!==claim.eventId||ack.tenantId!==claim.tenantId||ack.recipientIntegrationId!==claim.integrationId){reject(new DeliveryFailure('invalid_acknowledgement'));return;}
    resolve(status);
   });
  });
  req.on('error',reject);req.end(claim.body);
 });}finally{agent.destroy();}
}
