import type {components} from './schema.js';
type S=components['schemas'];
/** Driver session commands. Persist the complete envelope before sending; a
 * rejected waiting command needs a new action ID only after receipt changes. */
export class BranchesClient {
 constructor(private readonly fetcher:typeof fetch=(...args)=>globalThis.fetch(...args)){}
 async command(c:S['BranchInterruptCommand']|S['BranchArrivalCommand']|S['BranchResumeCommand']):Promise<S['ActionResult']>{
  const bootstrap=await this.fetcher('/api/session/bootstrap',{credentials:'same-origin',cache:'no-store'});if(!bootstrap.ok)throw new Error('تعذر التحقق من الجلسة.');
  const csrf=(await bootstrap.json() as {csrfToken:string}).csrfToken;
  const response=await this.fetcher(`/api/v1/branches/commands/${c.operationId}?kind=company`,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:JSON.stringify(c)});
  const value=await response.json();if(!response.ok&&!value.receipt)throw Object.assign(new Error(value.detail??'لم تتأكد زيارة الفرع.'),{status:response.status,code:value.code});return value;
 }
}
