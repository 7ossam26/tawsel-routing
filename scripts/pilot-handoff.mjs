import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateProvenance,validateAssetEntries,OSRM_IMAGE} from './engine-assets.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const sha=value=>createHash('sha256').update(value).digest('hex');
const commitPattern=/^[a-f0-9]{40}$/;
const imageRepositories={runtime:'tawsel-runtime',web:'tawsel-web',issuer:'tawsel-issuer',gateway:'tawsel-issuer-gateway',vroom:'tawsel-vroom',database:'tawsel-postgres',nominatim:'tawsel-nominatim'};
const imageNames=Object.keys(imageRepositories);
const appOrigin='https://app.switch2tech.cloud';
const usage='Usage: node scripts/pilot-handoff.mjs --inventory INVENTORY.json --assets ASSETS.json --provenance PROVENANCE.json [--images IMAGES.json]';

export function parseHandoffArguments(args){
  const options={};
  for(let index=0;index<args.length;index++){
    const flag=args[index];
    if(!['--inventory','--assets','--provenance','--images'].includes(flag)||options[flag.slice(2)]!==undefined)throw new Error(usage);
    const value=args[++index];
    if(!value||value.startsWith('--'))throw new Error(usage);
    options[flag.slice(2)]=resolve(value);
  }
  if(!options.inventory||!options.assets||!options.provenance)throw new Error(usage);
  return options;
}

function object(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`Invalid ${label}`);
  return value;
}
function safeText(value,label){
  if(typeof value!=='string'||value.length>1024||Array.from(value).some(character=>character.charCodeAt(0)<32||character.charCodeAt(0)===127))throw new Error(`Invalid inventory text: ${label}`);
  if(/\b[a-z][a-z0-9+.-]*:\/\/[^\s/]*@/i.test(value)||/[?&](?:access_token|token|password|secret|api_key)=/i.test(value))throw new Error(`Credential-bearing text is not allowed: ${label}`);
  return value;
}
function date(value,label){
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT.*Z$/.test(value)||!Number.isFinite(Date.parse(value)))throw new Error(`Invalid UTC timestamp: ${label}`);
  return value;
}
function pick(value,fields,label){
  object(value,label);
  const selected={};
  for(const key of fields){
    const item=value[key];
    if(item===undefined)continue;
    if(item===null||typeof item==='boolean')selected[key]=item;
    else if(typeof item==='number'&&Number.isFinite(item))selected[key]=item;
    else if(typeof item==='string')selected[key]=safeText(item,`${label}.${key}`);
    else throw new Error(`Invalid inventory field: ${label}.${key}`);
  }
  return selected;
}
function strings(value,label){
  if(!Array.isArray(value))throw new Error(`Invalid inventory list: ${label}`);
  return value.map((item,index)=>safeText(item,`${label}[${index}]`));
}
function mapArray(value,label,fn){
  if(value===undefined)return undefined;
  if(!Array.isArray(value))throw new Error(`Invalid inventory list: ${label}`);
  return value.map(fn);
}
function network(value){
  if(typeof value==='string')return safeText(value,'network');
  const result=pick(value,['name','driver','scope','internal','attachable','apiAttached','planningAttached','Name','Driver','Scope','Internal','Attachable'],'network');
  if(value.containers!==undefined)result.containers=mapArray(value.containers,'network.containers',item=>typeof item==='string'?safeText(item,'network.container'):pick(item,['name','service'],'network.container'));
  return result;
}
function targetComponent(value,fields,label){
  if(typeof value==='string')return safeText(value,label);
  if(typeof value==='number'&&Number.isFinite(value))return value;
  if(Array.isArray(value))return value.map(item=>targetComponent(item,fields,label));
  return pick(value,fields,label);
}

// Only observed, nonsecret inventory fields are exported. Env, labels, inspect
// Config, mount source paths, credentials and arbitrary metadata are omitted.
export function sanitizeInventory(value,{sourceCommit}={}){
  object(value,'inventory');
  if(value.schemaVersion!==1||!commitPattern.test(value.sourceCommit??''))throw new Error('Inventory requires schemaVersion 1 and a sourceCommit');
  if(sourceCommit&&value.sourceCommit!==sourceCommit)throw new Error('Inventory sourceCommit must match the final pushed commit');
  const result={schemaVersion:1,capturedAtUtc:date(value.capturedAtUtc,'inventory.capturedAtUtc'),sourceCommit:value.sourceCommit,purpose:'Observed inventory only; not a backup or proof of runtime readiness'};
  if(value.docker!==undefined){
    const docker=object(value.docker,'inventory.docker');
    result.docker={};
    if(docker.engine!==undefined)result.docker.engine=pick(docker.engine,['clientVersion','serverVersion','composeVersion','dokployVersion','architecture','cpus','memoryBytes','operatingSystem','kernelVersion'],'docker.engine');
    if(docker.containers!==undefined)result.docker.containers=mapArray(docker.containers,'docker.containers',container=>{
      const out=pick(container,['name','imageReference','state','health','restartPolicy','memoryLimitBytes','shmSizeBytes'],'docker.container');
      if(container.publishedPorts!==undefined)out.publishedPorts=mapArray(container.publishedPorts,'container.ports',port=>pick(port,['containerPort','hostPort','hostIp','protocol'],'container.port'));
      if(container.mounts!==undefined)out.mounts=mapArray(container.mounts,'container.mounts',mount=>pick(mount,['type','name','destination','readWrite'],'container.mount'));
      if(container.networks!==undefined)out.networks=mapArray(container.networks,'container.networks',network);
      return out;
    });
    if(docker.images!==undefined)result.docker.images=mapArray(docker.images,'docker.images',item=>{
      const out=pick(item,['sizeBytes'],'docker.image');
      if(item.references!==undefined)out.references=strings(item.references,'image.references');
      if(item.repoDigests!==undefined)out.repoDigests=strings(item.repoDigests,'image.repoDigests');
      return out;
    });
    if(docker.networks!==undefined)result.docker.networks=mapArray(docker.networks,'docker.networks',network);
    if(docker.statsSample!==undefined)result.docker.statsSample=mapArray(docker.statsSample,'docker.statsSample',sample=>pick(sample,['name','memory','memoryPercent','cpuPercent'],'docker.stats'));
    if(typeof docker.nominatimImportFinishedMarker==='boolean')result.docker.nominatimImportFinishedMarker=docker.nominatimImportFinishedMarker;
  }
  if(value.target!==undefined){
    const target=object(value.target,'inventory.target');
    result.target=pick(target,['capturedAtUtc','checkedAtUtc','architecture','hostname','cpus','cpuCount','memoryBytes','availableMemoryBytes','freeDiskBytes','memoryTotalBytes','memoryUsedBytes','diskTotalBytes','diskUsedBytes','swapBytes','dokployVersion','dockerVersion','composeVersion','applicationDataVerifiedEmpty','nominatimImportStatus'],'target');
    if(target.checkedAtUtc!==undefined)result.target.checkedAtUtc=date(target.checkedAtUtc,'target.checkedAtUtc');
    if(target.engineNetwork!==undefined)result.target.engineNetwork=network(target.engineNetwork);
    if(target.applications!==undefined)result.target.applications=pick(target.applications,['engineAutoDeploy','apiAutoDeploy','planningAutoDeploy','status'],'target.applications');
    for(const key of ['cpu','mem','memory','disk','server'])if(target[key]!==undefined)result.target[key]=targetComponent(target[key],['name','hostname','architecture','model','cores','logicalCpus','totalBytes','availableBytes','freeBytes','memoryBytes','cpus','provider','region','path','version'],`target.${key}`);
    if(target.network!==undefined)result.target.network=Array.isArray(target.network)?target.network.map(network):network(target.network);
    if(target.networks!==undefined)result.target.networks=mapArray(target.networks,'target.networks',network);
  }
  return result;
}

export function validateImageReport(value,commit){
  if(value===null||value===undefined)return null;
  object(value,'image report');
  if(value.commit!==commit||value.appOrigin!==appOrigin)throw new Error('Image report must match the final pushed commit and app origin');
  object(value.images,'image report images');
  const images={};
  for(const name of imageNames){
    const reference=value.images[name];
    if(typeof reference!=='string'||!reference.startsWith(`ghcr.io/7ossam26/${imageRepositories[name]}@sha256:`)||!/^ghcr\.io\/7ossam26\/tawsel-[a-z-]+@sha256:[a-f0-9]{64}$/.test(reference))throw new Error(`Image report requires an immutable GHCR digest: ${name}`);
    images[name]=reference;
  }
  return {commit,appOrigin,images};
}

function publicProvenance(value){
  const source={file:value.source.file,url:value.source.url,sizeBytes:value.source.sizeBytes,sha256:value.source.sha256};
  // Export only reviewed identity/status fields and validated version/time
  // metadata, never an arbitrary build environment.
  const profiles={};
  for(const mode of ['car','motorcycle']){
    const profile=value.profiles[mode];
    profiles[mode]={dataset:profile.dataset,status:profile.status};
    if(profile.profileSha256!==undefined)profiles[mode].profileSha256=profile.profileSha256;
  }
  return {schemaVersion:1,modes:['car','motorcycle'],source,osrmImage:value.osrmImage,profiles,...(value.osrmVersion!==undefined?{osrmVersion:value.osrmVersion}:{}),...(value.capturedAtUtc!==undefined?{capturedAtUtc:value.capturedAtUtc}:{})};
}

export function buildHandoffArtifacts({inventory,assets,provenance,imageReport=null,commit,branch,generatedAtUtc=new Date().toISOString()}){
  if(!commitPattern.test(commit??'')||typeof branch!=='string'||!branch||/[\r\n]/u.test(branch))throw new Error('Invalid handoff source identity');
  date(generatedAtUtc,'handoff.generatedAtUtc');
  const safeInventory=sanitizeInventory(inventory,{sourceCommit:commit});
  const normalized=validateProvenance(provenance,{allowIncomplete:true});
  const checked=validateAssetEntries(assets,normalized,{allowIncomplete:true});
  const safeProvenance=publicProvenance(normalized);
  const safeImages=validateImageReport(imageReport,commit);
  const sourceUrl=`https://github.com/7ossam26/tawsel-routing/tree/${commit}`;
  const pendingModes=['car','motorcycle'].filter(mode=>!checked.readiness[mode]);
  const verificationCommand='node scripts/pilot-asset-verify.mjs 03-ASSETS-SHA256.json /actual/engine-data /actual/maps --pbf-directory /actual/pbf --provenance ENGINE-PROVENANCE.json'+(checked.ready?'':' --allow-incomplete');
  const readiness={ready:false,inputManifestReady:checked.ready&&safeImages!==null,classification:'Overall readiness remains false: input manifest completeness does not establish target hashes, imported Nominatim, fresh application stores or runtime checks',engineAssetsComplete:checked.ready,profiles:checked.readiness,imagesAvailable:safeImages!==null,targetRuntimeVerified:false,pendingModes};
  const assetState=checked.ready?'قائمة ملفات التوجيه كاملة وفق تعريف أجزاء التشغيل؛ يلزم فحص البايتات والبصمات في مسارات الهدف.':`Bootstrap غير جاهز لتشغيل Engine: ملفات ${pendingModes.join(' / ')} غير مكتملة أو حالتها pending/failed. المرفقات تسمح بتجهيز PBF والخريطة فقط؛ لا تستخدمها كدليل جاهزية توجيه.`;
  const artifactValues={
    '00-START-HERE-AR.md':`# تعليمات للشات الجديد: تجربة Tawsel خطوة بخطوة\n\nالمصدر المثبت: ${sourceUrl}. اقرأ الملفات المرفقة والمصدر ذي الصلة لهذا الـcommit. لا تملك وصولًا تلقائيًا لجهازي أو SSH أو Dokploy؛ لا تفترض تنفيذًا لم ترَ نتيجته.\n\nالهدف تجربة جديدة مصرّح بها، باستخدام native Dokploy Applications وnative Database، وEngine Compose وحده. المطلوب بدء التطبيق والهوية وMock ببيانات جديدة بعد إثبات فراغها؛ لا ننقل قواعد تجارب الجهاز القديمة. D-113 يتيح car وmotorcycle فقط ويرفض bicycle وbike.\n\n**في كل رد خطوة تنفيذية واحدة فقط.** حدد مكان التنفيذ والنتيجة المتوقعة والدليل المنقح، ثم انتظر ردي. لا تطلب كلمات مرور أو tokens أو ملفات env أو مفاتيح أو dumps في الشات؛ أدخل الأسرار في مكانها المحمي مباشرة. شخّص الفشل قبل الاستمرار.\n\nابدأ بالجرد المرفق ثم طابقه مع حالة السيرفر الحالية. حزمة bootstrap التي تظهر ready=false تحتاج استكمال التجهيز، وليست إذنًا لتشغيل ملفات جزئية. لا تعتبر queued أو healthcheck دليل نجاح. شروط backup/restore الكاملة للإنتاج لا تمنع التجربة الحالية، ولا تصبح ناجحة بمجرد تنفيذها.\n`,
    '01-CURRENT-STATE-AR.md':`# الحالة المسجلة وحدودها\n\n- المصدر: ${sourceUrl}\n- وقت الجرد: ${safeInventory.capturedAtUtc}؛ جرد حالة فقط وليس backup.\n- الأنماط الحالية: car / motorcycle فقط.\n- PBF المختار: ${safeProvenance.source.file}؛ SHA-256: ${safeProvenance.source.sha256}.\n- car: ${safeProvenance.profiles.car.dataset} / ${safeProvenance.profiles.car.status}.\n- motorcycle: ${safeProvenance.profiles.motorcycle.dataset} / ${safeProvenance.profiles.motorcycle.status}.\n- ${assetState}\n- صور الإصدار: ${safeImages?'سبعة digests مثبتة لنفس الـcommit مرفقة؛ وجودها لا يثبت deployment.':'تقرير الصور pending؛ اجلب تقرير digests لنفس الـcommit قبل نشر الخدمات.'}\n- لا تقدم هذه الحزمة دليل نجاح Mock ERP أو jobs على الـVPS أو جاهزية إنتاج. نتائج التشغيل تحتاج دليلًا مستقلًا.\n`,
    '02-LOCAL-INVENTORY.json':safeInventory,
    '03-ASSETS-SHA256.json':checked.entries,
    '04-DOKPLOY-NOTES-AR.md':`# مسار Dokploy الحالي\n\n- استخدم native Applications وnative Database للتطبيق/الهوية/Mock؛ استخدم deploy/engine.compose.yaml للـEngine وحده. Root Compose خاص بالتجهيز المحلي.\n- اضبط autoDeploy=false أثناء التحديث. راجع الصور والإعدادات والمجلدات والشبكات الفعلية ثم نفّذ deployments صراحة.\n- شبكة Engine الخارجية: tawsel-engine-swarm، driver=overlay وInternal=true وAttachable=true. تحقق من ربط API وplanning بالشبكة فعليًا بعد التحديث. لا تستنتج الربط من اسم الشبكة فقط.\n- app.switch2tech.cloud إلى web:8080؛ auth.switch2tech.cloud إلى issuer-gateway:8080؛ mock.switch2tech.cloud إلى public-test mock:3010. admin.switch2tech.cloud لإدارة Dokploy. لا تعرض Engine أو database أو API/workers أو raw Keycloak للعامة.\n- احتفظ بـOSRM digest ${OSRM_IMAGE}. أعد بناء VROOM؛ إعداد الأنماط يُنسخ إلى الصورة عند build، ويبدأ Node مباشرة مع log في /tmp. مجرد بدء الحاوية القديمة لا يثبت تحميل الإعداد الجديد.\n- افحص حجب /admin و/realms/master، ووجود team subject allowlist للـMock، وحدود callback العامة. لا تغير حدود الشبكة/الهوية لإخفاء فشل التجربة.\n`,
    '05-DEPLOYMENT-PREREQUISITES-AR.md':`# التجهيز والفحوص قبل تشغيل Engine\n\n${assetState}\n\nEGYPT_PBF_FILE=${safeProvenance.source.file}\nOSRM_CAR_DATASET=${safeProvenance.profiles.car.dataset}\nMotorcycle dataset=${safeProvenance.profiles.motorcycle.dataset}\n\nخطة السيرفر الحالية تختار ملفات 261002، والقيم الفعلية لهذا المرفق موضحة في provenance؛ لا تعتمد تاريخًا ثابتًا بدل التحقق من المصدر المختار. الافتراض المحلي القديم يظل egypt-260913.osm.pbf وegypt-260913.osrm؛ لا تستبدل مصدرًا جديدًا باسم التاريخ القديم. جهّز datasets خارج الملفات المركبة في خدمات حية. لا تنقل أي bicycle أو ملفات preprocessing جزئية. Nominatim على مسار bootstrap يحتاج volume فارغًا واستيراد المصدر المختار ثم PG16/import-finished؛ لا تعتبر وجود PBF دليل اكتمال قاعدة البيانات.\n\nافحص البصمات على المسارات الفعلية للهدف:\n\n\`\`\`sh\n${verificationCommand}\n\`\`\`\n\nفحص bootstrap مع --allow-incomplete يمكنه إثبات ملفات PBF/maps المتاحة فقط؛ ready يظل false إلى أن توجد أجزاء تشغيل كلا النمطين مكتملة. بعد اكتمال التجهيز أعد الجرد/manifest/provenance والفحص الكامل.\n\nبعد نشر الصور والإعدادات الصحيحة، سجل ستة فحوص مستقلة: route/table/optimize × car/motorcycle. افحص Nominatim والخريطة وربط API/planning بشكل منفصل، ثم رحلة الطلب ونتيجة callback/applied projection. هذه خطوات تحتاج نتائج فعلية، وليست نتائج تدعيها الحزمة.\n`,
    'ENGINE-PROVENANCE.json':safeProvenance
  };
  const artifacts=new Map(Object.entries(artifactValues).map(([name,value])=>[name,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n']));
  const filesSha256=Object.fromEntries([...artifacts].map(([name,value])=>[name,sha(value)]));
  const manifest={schemaVersion:1,generatedAtUtc,sourceCommit:commit,sourceUrl,sourceBranch:branch,inventoryCapturedAtUtc:safeInventory.capturedAtUtc,appOrigin,authOrigin:'https://auth.switch2tech.cloud',mockOrigin:'https://mock.switch2tech.cloud',modes:['car','motorcycle'],osrmImage:OSRM_IMAGE,readiness,assetSummary:{files:checked.files,totalBytes:checked.totalBytes},imageReport:safeImages??{status:'pending-github-actions-workflow',requiredCommit:commit},filesSha256};
  artifacts.set('MANIFEST.json',JSON.stringify(manifest,null,2)+'\n');
  return {artifacts,manifest};
}

const runGit=(...args)=>{
  const result=spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
  if(result.status!==0)throw new Error('Git state unavailable');
  return result.stdout.trim();
};
export function requirePushedSource(git=runGit){
  if(git('status','--porcelain'))throw new Error('Commit tracked changes and remove unrelated untracked files before generating the handoff');
  const commit=git('rev-parse','HEAD'),branch=git('branch','--show-current');
  if(!commitPattern.test(commit)||!branch)throw new Error('Handoff requires a branch with a committed source identity');
  const lines=git('ls-remote','origin',`refs/heads/${branch}`).split('\n');
  if(!lines.some(line=>{const [remote,ref]=line.split(/\s+/);return remote===commit&&ref===`refs/heads/${branch}`;}))throw new Error('Push the final source branch before generating the handoff');
  return {commit,branch};
}
async function readJson(path,label){
  try{return JSON.parse(await readFile(path,'utf8'));}catch{throw new Error(`Unable to read valid JSON for --${label}`);}
}
export async function writeHandoff(output,artifacts){
  await mkdir(output,{recursive:true});
  for(const [name,value] of artifacts)await writeFile(join(output,name),value,{flag:'wx'});
}
async function main(){
  const args=parseHandoffArguments(process.argv.slice(2));
  const context=requirePushedSource();
  const [inventory,assets,provenance,imageReport]=await Promise.all([readJson(args.inventory,'inventory'),readJson(args.assets,'assets'),readJson(args.provenance,'provenance'),args.images?readJson(args.images,'images'):null]);
  const {artifacts}=buildHandoffArtifacts({inventory,assets,provenance,imageReport,...context});
  const output=resolve(root,'.local/dokploy-handoff',new Date().toISOString().replace(/[:.]/g,'-'));
  await writeHandoff(output,artifacts);
  console.log(output);
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
