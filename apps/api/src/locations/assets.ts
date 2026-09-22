import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {FastifyInstance} from 'fastify';
export async function mapAssetRoutes(app:FastifyInstance,directory=process.env.TAWSEL_MAP_ASSET_DIR??fileURLToPath(new URL('../../../../.local/maps',import.meta.url))){
 const root=resolve(directory);
 app.get('/maps/*',async(request,reply)=>{
  const name=(request.params as {'*':string})['*'];
  if(!/^(?:style\.json|cairo\.pmtiles|rtl\.js|sprites\/v4\/light(?:@2x)?\.(?:json|png)|fonts\/Noto Sans Regular\/\d+-\d+\.pbf)$/.test(name))return reply.code(404).send();
  const path=resolve(root,name);if(!path.startsWith(root+sep))return reply.code(404).send();
  let info;try{info=await stat(path);}catch{return reply.code(503).send({error:{code:'map_assets_unavailable',message:'الخريطة غير متاحة؛ تفاصيل المهمة وتحديد الإحداثيات متاحان.'}});}
  reply.header('Accept-Ranges','bytes').header('Cache-Control','public, max-age=3600').header('X-Content-Type-Options','nosniff');
  reply.type(name.endsWith('.json')?'application/json':name.endsWith('.js')?'application/javascript':name.endsWith('.png')?'image/png':'application/octet-stream');
  const range=request.headers.range;
  if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);const start=Number(match?.[1]),end=match?.[2]?Number(match[2]):info.size-1;
   if(!match||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||start>=info.size){return reply.code(416).header('Content-Range',`bytes */${info.size}`).send();}
   const last=Math.min(end,info.size-1);reply.code(206).header('Content-Range',`bytes ${start}-${last}/${info.size}`).header('Content-Length',last-start+1);return reply.send(createReadStream(path,{start,end:last}));
  }
  reply.header('Content-Length',info.size);return reply.send(createReadStream(path));
 });
}
