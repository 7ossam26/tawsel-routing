import {createHash,randomBytes,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';
import * as oidc from 'openid-client';
import type {Pool} from 'pg';
import type {FastifyInstance,FastifyRequest} from 'fastify';
import cookie from '@fastify/cookie';
import type {NativeConfig} from './config.js';
import {ReceiverError} from './inbox.js';
import {transaction} from './database.js';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const random=()=>randomBytes(32).toString('base64url');
export class NativeSessions {
 private client:Promise<oidc.Configuration>|undefined;
 constructor(readonly pool:Pool,readonly config:NativeConfig){}
 private issuer(){
  if(!this.client){this.client=oidc.discovery(new URL(this.config.issuer),this.config.clientId,this.config.clientSecret,undefined,{timeout:5,execute:[oidc.enableNonRepudiationChecks,...(this.config.issuer.startsWith('http:')?[oidc.allowInsecureRequests]:[])]});this.client.catch(()=>{this.client=undefined;});}
  return this.client;
 }
 private seal(value:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(this.config.sessionKey,'hex'),iv);return Buffer.concat([iv,cipher.update(value,'utf8'),cipher.final(),cipher.getAuthTag()]).toString('base64url');}
 private unseal(value:string){const b=Buffer.from(value,'base64url'),decipher=createDecipheriv('aes-256-gcm',Buffer.from(this.config.sessionKey,'hex'),b.subarray(0,12));decipher.setAuthTag(b.subarray(-16));return Buffer.concat([decipher.update(b.subarray(12,-16)),decipher.final()]).toString('utf8');}
 async rate(ip:string,category:string,limit:number){const bucket=hash(`${ip}/${category}/${Math.floor(Date.now()/60000)}`);await this.pool.query('DELETE FROM mock_erp.native_rate_limits WHERE expires_at<clock_timestamp()');const r=(await this.pool.query("INSERT INTO mock_erp.native_rate_limits VALUES($1,1,clock_timestamp()+interval '2 minutes') ON CONFLICT(bucket) DO UPDATE SET hits=mock_erp.native_rate_limits.hits+1 RETURNING hits",[bucket])).rows[0];if(r.hits>limit)throw new ReceiverError(429,'native_rate_limited');}
 async begin(browser:string){
  const client=await this.issuer(),state=random(),nonce=random(),verifier=oidc.randomPKCECodeVerifier();
  await this.pool.query('DELETE FROM mock_erp.login_attempts WHERE expires_at<clock_timestamp()');
  await this.pool.query("INSERT INTO mock_erp.login_attempts VALUES($1,$2,$3,$4,clock_timestamp()+interval '10 minutes')",[hash(state),hash(browser),this.seal(verifier),nonce]);
  return oidc.buildAuthorizationUrl(client,{redirect_uri:`${this.config.origin}/callback`,scope:'openid profile',state,nonce,prompt:'login',code_challenge_method:'S256',code_challenge:await oidc.calculatePKCECodeChallenge(verifier),ui_locales:'ar'}).href;
 }
 async complete(url:URL,browser:string){
  const row=(await this.pool.query('DELETE FROM mock_erp.login_attempts WHERE state_hash=$1 AND browser_hash=$2 AND expires_at>clock_timestamp() RETURNING *',[hash(url.searchParams.get('state')??''),hash(browser)])).rows[0];
  if(!row)throw new ReceiverError(401,'login_failed');
  const client=await this.issuer();let tokens;
  try{tokens=await oidc.authorizationCodeGrant(client,url,{pkceCodeVerifier:this.unseal(row.verifier_cipher as string),expectedState:url.searchParams.get('state')!,expectedNonce:row.nonce as string,idTokenExpected:true});}
  catch(e){const error=e as {code?:string;error?:string;cause?:{code?:string;claim?:string}};console.error(JSON.stringify({component:'native-oidc',code:error.code,error:error.error,causeCode:error.cause?.code,claim:error.cause?.claim}));throw new ReceiverError(401,'login_failed');}
  const sub=tokens.claims()?.sub;
  if(!sub||!this.config.adminSubjects.includes(sub))throw new ReceiverError(403,'native_access_denied');
  if(!tokens.refresh_token||!tokens.expires_in)throw new ReceiverError(401,'login_failed');
  const session=random();await this.pool.query("INSERT INTO mock_erp.native_sessions VALUES($1,$2,$3,clock_timestamp()+interval '30 minutes',$4)",[hash(session),sub,this.seal(JSON.stringify({access:tokens.access_token,refresh:tokens.refresh_token,expires:Date.now()+tokens.expires_in*1000})),random()]);return session;
 }
 async use(r:FastifyRequest,write=false){
  const value=r.cookies['mock-erp-session'];if(!value)throw new ReceiverError(401,'native_login_required');
  return transaction(this.pool,async tx=>{
  const row=(await tx.query('SELECT * FROM mock_erp.native_sessions WHERE session_hash=$1 AND expires_at>clock_timestamp() FOR UPDATE',[hash(value)])).rows[0];
  if(!row||!this.config.adminSubjects.includes(row.subject as string))throw new ReceiverError(401,'native_login_required');
  const client=await this.issuer(),tokens=JSON.parse(this.unseal(row.token_cipher as string)) as {access:string;refresh:string;expires:number};
  if(tokens.expires<Date.now()+15000){const next=await oidc.refreshTokenGrant(client,tokens.refresh);if(!next.expires_in||(next.claims()&&next.claims()!.sub!==row.subject))throw new ReceiverError(401,'native_login_required');tokens.access=next.access_token;tokens.refresh=next.refresh_token??tokens.refresh;tokens.expires=Date.now()+next.expires_in*1000;await tx.query('UPDATE mock_erp.native_sessions SET token_cipher=$2 WHERE session_hash=$1',[hash(value),this.seal(JSON.stringify(tokens))]);}
  const info=await oidc.tokenIntrospection(client,tokens.access);
  if(!info.active||info.sub!==row.subject)throw new ReceiverError(401,'native_login_required');
  if(write){const actual=Buffer.from(typeof r.headers['x-csrf-token']==='string'?r.headers['x-csrf-token']:''),expected=Buffer.from(row.csrf as string);if(r.headers.origin!==this.config.origin||actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new ReceiverError(403,'native_csrf_denied');}
  return {subject:row.subject as string,csrf:row.csrf as string};
  });
 }
 async register(app:FastifyInstance){
  await app.register(cookie);app.addHook('onRequest',async r=>{if(r.url==='/login'||r.url.startsWith('/callback'))await this.rate(r.ip,'entry',20);else if(r.url.startsWith('/native/'))await this.rate(r.ip,r.method==='GET'?'read':'write',r.method==='GET'?600:60);});
  const options={path:'/',httpOnly:true,sameSite:'lax' as const,secure:this.config.origin.startsWith('https:'),maxAge:1800};
  app.get('/login',async(_r,reply)=>{const browser=random();reply.setCookie('mock-erp-login',browser,{...options,maxAge:600});return reply.redirect(await this.begin(browser));});
  app.get('/callback',async(r,reply)=>{const session=await this.complete(new URL(r.url,this.config.origin),r.cookies['mock-erp-login']??'');reply.clearCookie('mock-erp-login',{path:'/'}).setCookie('mock-erp-session',session,options);return reply.redirect('/');});
  app.get('/native/session',async r=>this.use(r));
  app.post('/native/logout',async(r,reply)=>{await this.use(r,true);await this.pool.query('DELETE FROM mock_erp.native_sessions WHERE session_hash=$1',[hash(r.cookies['mock-erp-session']!)]);return reply.clearCookie('mock-erp-session',{path:'/'}).send({loggedOut:true});});
 }
}
