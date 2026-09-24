import {createServer} from 'node:http';
import {verifyWebhook,type WebhookKey,type WebhookScope} from '../../../../packages/api-client/src/webhook-signature.js';
export async function controlledReceiver(scope?:WebhookScope,keys:WebhookKey[]=[]){
 const captures:{body:Buffer;headers:Record<string,string>;event:Record<string,unknown>;signatureValid:boolean}[]=[];
 const controls={mode:'received' as 'received'|'lose-response'|'timeout'|'redirect'|'invalid-ack'|'unavailable',beforeAck:async()=>{}};
 // P25 controlled process-memory receiver, NOT a durable P26 inbox/projection.
 const server=createServer(async(req,res)=>{
  const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk as Buffer));
  const body=Buffer.concat(chunks),headers=Object.fromEntries(Object.entries(req.headers).filter((e):e is [string,string]=>typeof e[1]==='string'));
  const event=JSON.parse(body.toString('utf8')) as Record<string,unknown>;
  const actualScope=scope??{tenantId:String(event.tenantId),integrationId:String(event.recipientIntegrationId)};
  const signatureValid=verifyWebhook(body,headers,actualScope,keys);
  captures.push({body,headers,event,signatureValid});
  await controls.beforeAck();
  if(controls.mode==='lose-response'){res.destroy();return;}
  if(controls.mode==='timeout')return;
  if(controls.mode==='redirect'){res.writeHead(302,{location:'/redirected'});res.end();return;}
  if(controls.mode==='unavailable'){res.writeHead(503);res.end('private receiver error: do not log');return;}
  res.setHeader('content-type','application/json');
  res.end(JSON.stringify({schemaVersion:'1.0.0',tenantId:event.tenantId,recipientIntegrationId:event.recipientIntegrationId,eventId:controls.mode==='invalid-ack'?'wrong':event.eventId,acknowledgement:'received'}));
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();if(!address||typeof address==='string')throw new Error('Receiver address');
 return {url:`http://127.0.0.1:${address.port}/events`,captures,controls,keys,acknowledgementLevel:'controlled-process-memory' as const,
  async close(){server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}};
}
