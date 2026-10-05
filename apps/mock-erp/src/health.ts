import {validateNative,type ReceiverConfig} from './config.js';

/** Probe the container locally, including a validated public-test listener.
 * Public HTTPS origins and trusted proxies never become health-request URLs. */
export async function assertReceiverListenerHealthy(config:ReceiverConfig,fetcher:typeof fetch=fetch){
 validateNative(config);
 const mode=config.native?.mode??(config.native?.privateTestOnly?'loopback':undefined);
 if(!Number.isInteger(config.port)||config.port<1||config.port>65535||
   !(mode==='public-test'&&config.host==='0.0.0.0'||mode==='loopback'&&config.host==='127.0.0.1'))throw new Error('Managed mock listener required');
 const response=await fetcher(`http://127.0.0.1:${config.port}/health`,{signal:AbortSignal.timeout(3000),redirect:'error'});
 if(!response.ok||(await response.json() as {service:string}).service!=='external-mock-erp')throw new Error('Mock unavailable');
}
