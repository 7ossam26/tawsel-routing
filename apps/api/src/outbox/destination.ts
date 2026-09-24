import {Resolver} from 'node:dns/promises';
import {BlockList,isIP} from 'node:net';
import type {OutboxConfig,OutboxScope} from './config.js';

const denied=new BlockList();
for(const [ip,bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const)denied.addSubnet(ip,bits,'ipv4');
const globalV6=new BlockList();globalV6.addSubnet('2000::',3,'ipv6');
for(const [ip,bits] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]] as const)denied.addSubnet(ip,bits,'ipv6');
export function isPublicAddress(address:string):boolean{
 const family=isIP(address);return family===4?!denied.check(address,'ipv4'):family===6&&globalV6.check(address,'ipv6')&&!denied.check(address,'ipv6');
}
export class DeliveryFailure extends Error {constructor(readonly code:string,readonly httpStatus?:number){super(code);}}
export function approvedUrl(raw:string,scope:OutboxScope,config:OutboxConfig):URL{
 let url:URL;try{url=new URL(raw);}catch{throw new DeliveryFailure('destination_denied');}
 if(url.href!==raw||url.username||url.password||url.hash||url.search||!config.destinations.some(d=>d.tenantId===scope.tenantId&&d.integrationId===scope.integrationId&&d.url===raw))throw new DeliveryFailure('destination_denied');
 const host=url.hostname.replace(/^\[|\]$/g,'');
 const isolated=config.testLoopback===true&&url.protocol==='http:'&&host==='127.0.0.1';
 if(!isolated&&(url.protocol!=='https:'||url.port||host==='localhost'||host.endsWith('.localhost')||(isIP(host)&&!isPublicAddress(host))))throw new DeliveryFailure('destination_denied');
 return url;
}
async function resolveHost(host:string,signal:AbortSignal):Promise<string[]>{
 const resolver=new Resolver({timeout:1500,tries:1}),cancel=()=>resolver.cancel();
 signal.throwIfAborted();signal.addEventListener('abort',cancel,{once:true});
 try{
  const results=await Promise.allSettled([resolver.resolve4(host),resolver.resolve6(host)]);
  signal.throwIfAborted();
  return results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
 }finally{signal.removeEventListener('abort',cancel);}
}
export async function resolveDestination(raw:string,scope:OutboxScope,config:OutboxConfig,signal:AbortSignal,resolve=resolveHost){
 const url=approvedUrl(raw,scope,config),host=url.hostname.replace(/^\[|\]$/g,'');
 const addresses=isIP(host)?[host]:await resolve(host,signal);
 if(!addresses.length)throw new DeliveryFailure('dns_unavailable');
 if(!addresses.every(ip=>isPublicAddress(ip)||(config.testLoopback===true&&host==='127.0.0.1'&&ip==='127.0.0.1')))throw new DeliveryFailure('destination_denied');
 return {url,address:addresses[0]!,family:isIP(addresses[0]!)};
}
