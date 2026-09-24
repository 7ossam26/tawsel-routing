import {randomBytes,randomUUID} from 'node:crypto';
import {expect,test} from 'vitest';
import {sourceFixture} from '../support/source-fixture.js';
import {issuerFixture} from '../../../api/test/support/issuer-fixture.js';
import {receiverApp} from '../../src/app.js';
import {runSourceOnce} from '../../src/source.js';
import {withAccess} from '../../../api/src/access/service.js';
test('B: separate OIDC/PKCE native session, current issuer revocation and CSRF protect trusted versioned exceptions; no actor selector',async()=>{
 const f=await sourceFixture(),issuer=await issuerFixture();issuer.state.subject='staff';issuer.state.audience='erp-reference';
 const native={privateTestOnly:true as const,origin:'http://localhost:5191',issuer:`${issuer.origin}/company`,clientId:'erp-reference',clientSecret:'fixture-secret',sessionKey:randomBytes(32).toString('hex'),adminSubjects:['staff']};
 const app=receiverApp(f.erp.pool,{...f.c,native});await app.ready();
 try{
  await f.setup();await f.db.pool.query('UPDATE tawsel.identity_subjects SET enabled=true WHERE tenant_id=$1',[f.c.tenantId]); // labelled issuer readiness fixture
  expect((await app.inject('/native/state')).statusCode).toBe(401);
  const begin=await app.inject('/login'),browser=begin.cookies.find(c=>c.name==='mock-erp-login')!.value;
  const grant=await fetch(begin.headers.location!,{redirect:'manual'}),callback=new URL(grant.headers.get('location')!);
  expect((await app.inject({url:callback.pathname+callback.search})).statusCode).toBe(401);
  const login=await app.inject({url:callback.pathname+callback.search,cookies:{'mock-erp-login':browser}});expect(login.statusCode,login.body).toBe(302);
  expect((await app.inject({url:callback.pathname+callback.search,cookies:{'mock-erp-login':browser}})).statusCode).toBe(401);
  const cookies={'mock-erp-session':login.cookies.find(c=>c.name==='mock-erp-session')!.value};
  const session=await app.inject({url:'/native/session',cookies});expect(session.statusCode,session.body).toBe(200);
  const body={actionId:randomUUID(),operationId:'user.setCapabilityExceptions',payload:{externalId:'driver',sourceRevision:2,exceptions:[{capability:'execution.own',effect:'deny'}]},expectedRevisions:{'user/driver':1}};
  const post=(payload:object,headers:Record<string,string>={})=>app.inject({method:'POST',url:'/native/commands',cookies,headers,payload});
  expect((await post(body)).statusCode).toBe(403);
  const headers={origin:native.origin,'x-csrf-token':session.json().csrf as string};
  expect((await post({...body,actor:'another-user'},headers)).statusCode).toBe(400);
  const saved=await post(body,headers);expect(saved.statusCode,saved.body).toBe(202);expect(saved.json()).toMatchObject({status:'pending',actor_subject:'staff'});
  await runSourceOnce(f.erp.pool,f.c);
  expect((await post(body,headers)).json().status).toBe('accepted');
  const capabilities=()=>withAccess(f.db.pool,{kind:'account',issuer:'https://issuer.fixture.invalid',subject:'source-driver'},async a=>a.context.effectiveCapabilities);
  expect(await capabilities()).not.toContain('execution.own');
  const inherit={...body,actionId:randomUUID(),payload:{...body.payload,sourceRevision:3,exceptions:[{capability:'execution.own',effect:'inherit'}]},expectedRevisions:{'user/driver':2}};
  expect((await post(inherit,headers)).statusCode).toBe(202);await runSourceOnce(f.erp.pool,f.c);expect(await capabilities()).toContain('execution.own');
  issuer.state.active=false;expect((await app.inject({url:'/native/state',cookies})).statusCode).toBe(401);
  expect((await post({...body,actionId:randomUUID()},headers)).statusCode).toBe(401);
 }finally{await app.close();await issuer.close();await f.close();}
},60000);
