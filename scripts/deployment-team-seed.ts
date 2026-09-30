import { readFile, writeFile } from 'node:fs/promises';

interface TeamUser { username: string; email: string; temporaryPassword: string }
interface TeamInput { users: TeamUser[] }
const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath || inputPath === outputPath) throw new Error('Private team input and new output paths required');
const input = JSON.parse(await readFile(inputPath, 'utf8')) as TeamInput;
if (!Array.isArray(input.users) || input.users.length < 1 || input.users.length > 20 ||
  input.users.some(u => !/^[a-z0-9._-]{3,64}$/.test(u.username) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u.email) || u.temporaryPassword.length < 12) ||
  new Set(input.users.map(u => u.username)).size !== input.users.length) throw new Error('Invalid private team seed input');
const issuer = process.env.TAWSEL_COMPANY_ISSUER, adminOrigin = process.env.TAWSEL_ISSUER_ADMIN_ORIGIN;
const clientId = process.env.TAWSEL_ISSUER_WORKER_CLIENT_ID, clientSecret = process.env.TAWSEL_ISSUER_WORKER_CLIENT_SECRET;
if (!issuer || !adminOrigin || !clientId || !clientSecret || !/^https:\/\/[^/]+\/realms\/tawsel-company$/.test(issuer) || !/^http:\/\/[a-z0-9-]+:\d+$/.test(adminOrigin)) throw new Error('Public company issuer and private administration configuration required');
const tokenResponse = await fetch(`${adminOrigin}/realms/tawsel-company/protocol/openid-connect/token`, { method: 'POST', body: new URLSearchParams({ grant_type:'client_credentials', client_id:clientId, client_secret:clientSecret }), signal:AbortSignal.timeout(10000) });
if (!tokenResponse.ok) throw new Error('Issuer worker token unavailable');
const { access_token: token } = await tokenResponse.json() as { access_token?: string };
if (!token) throw new Error('Issuer worker token missing');
const url = `${adminOrigin}/admin/realms/tawsel-company/users`;
let subjects:Record<string,string>={};
try{subjects=(JSON.parse(await readFile(outputPath,'utf8')) as {subjects:Record<string,string>}).subjects;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;await writeFile(outputPath,JSON.stringify({subjects},null,2),{flag:'wx',mode:0o600});}
for (const user of input.users) {
  let subject=subjects[user.username];
  if(!subject){
    const created=await fetch(url,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({username:user.username,email:user.email,enabled:true,emailVerified:false,requiredActions:['UPDATE_PASSWORD','VERIFY_EMAIL']}),signal:AbortSignal.timeout(10000)});
    if(created.status!==201)throw new Error(`Team account creation failed for ${user.username}; inspect privately`);
    const location=created.headers.get('location')??'';subject=location.split('/').at(-1)??'';
    if(!/^[a-f0-9-]{36}$/.test(subject))throw new Error('Issuer did not return a user subject');
    subjects[user.username]=subject;await writeFile(outputPath,JSON.stringify({subjects},null,2),{mode:0o600});
  }
  const password=await fetch(`${url}/${subject}/reset-password`,{method:'PUT',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({type:'password',value:user.temporaryPassword,temporary:true}),signal:AbortSignal.timeout(10000)});
  if(password.status!==204)throw new Error(`Temporary credential creation failed for ${user.username}; inspect privately`);
}
console.log(`Created ${input.users.length} restricted team account(s); subject IDs saved to the private output file.`);
