import {afterEach,describe,expect,it,vi} from 'vitest';
import {assertReceiverListenerHealthy} from '../../src/health.js';
import type {ReceiverConfig} from '../../src/config.js';

const publicConfig=():ReceiverConfig=>({tenantId:'11111111-1111-4111-8111-111111111111',integrationId:'22222222-2222-4222-8222-222222222222',statusToken:'s'.repeat(32),keys:[{keyId:'pilot',secret:'a'.repeat(64)}],host:'0.0.0.0',port:3010,testLoopback:false,tawselBaseUrl:'https://app.example.test/',tawselAuthorization:'Bearer scoped',native:{mode:'public-test',origin:'https://mock.example.test',issuer:'https://auth.example.test/realms/tawsel-company',clientId:'tawsel-mock-erp',clientSecret:'client-secret',sessionKey:'b'.repeat(64),adminSubjects:['staff-subject'],trustedProxyCidrs:['172.30.0.0/24']}});
const healthyFetch=()=>vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({service:'external-mock-erp'})));
afterEach(()=>vi.unstubAllEnvs());
describe('managed Mock listener health',()=>{
 it('checks an explicitly validated public-test listener locally without following redirects',async()=>{
  vi.stubEnv('NODE_ENV','production');const fetcher=healthyFetch();await assertReceiverListenerHealthy(publicConfig(),fetcher);
  expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:3010/health',expect.objectContaining({redirect:'error',signal:expect.any(AbortSignal)}));
 });
 it('retains the private loopback mode in development',async()=>{
  vi.stubEnv('NODE_ENV','development');const c=publicConfig();c.host='127.0.0.1';c.testLoopback=true;c.native={...c.native!,mode:'loopback',privateTestOnly:true};const fetcher=healthyFetch();
  await assertReceiverListenerHealthy(c,fetcher);expect(fetcher).toHaveBeenCalledOnce();
 });
 it.each(['listener','proxy','https','port','native'] as const)('refuses invalid %s before any provider call',async field=>{
  vi.stubEnv('NODE_ENV','production');const c=publicConfig();
  if(field==='listener')c.host='attacker.example.test';else if(field==='proxy')c.native!.trustedProxyCidrs=['0.0.0.0/0'];else if(field==='https')c.tawselBaseUrl='http://app.example.test/';else if(field==='port')c.port=0;else delete c.native;
  const fetcher=healthyFetch();await expect(assertReceiverListenerHealthy(c,fetcher)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
 });
 it('keeps production loopback staging rejected',async()=>{
  vi.stubEnv('NODE_ENV','production');const c=publicConfig();c.host='127.0.0.1';c.native={...c.native!,mode:'loopback',privateTestOnly:true};const fetcher=healthyFetch();
  await expect(assertReceiverListenerHealthy(c,fetcher)).rejects.toThrow('private/test-only');expect(fetcher).not.toHaveBeenCalled();
 });
 it.each([new Response('{}',{status:503}),new Response(JSON.stringify({service:'other-app'}))])('rejects a failed or unrelated service health response',async response=>{
  vi.stubEnv('NODE_ENV','production');await expect(assertReceiverListenerHealthy(publicConfig(),vi.fn<typeof fetch>().mockResolvedValue(response))).rejects.toThrow('Mock unavailable');
 });
});
