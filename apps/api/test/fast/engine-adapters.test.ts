import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { expect, test } from 'vitest';
import { loadEngineConfig, profiles, validateConfig } from '../../src/engine/config.js';
import { optimizationRequest, osrmUrl } from '../../src/engine/requests.js';
import { validateModel, type OptimizationInput } from '../../src/engine/models.js';
import { optimizationResponse, routeResponse, tableResponse } from '../../src/engine/responses.js';
import { optimizationFixture, routeFixture, tableFixture } from '../support/engine-fixtures.js';
import { RoutingEngine } from '../../src/engine/index.js';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { assertRoutingCandidate } from '../../../../tests/erp-conformance/routing.js';

export const input: OptimizationInput = {
  mode: 'bicycle', accountKind: 'personal', origin: {kind:'manual-pin',coordinates:{latitude:30.0444,longitude:31.2357}},
  endpoint: {kind:'last-customer'}, tasks:[{taskId:'customer-a',coordinates:{latitude:30.05,longitude:31.24}},{taskId:'customer-b',coordinates:{latitude:30.06,longitude:31.25}}]
};
test.each(['car','motorcycle','bicycle'] as const)('%s deliberately maps to retained Compose dataset and VROOM service',mode=>{
  const compose=parse(readFileSync('docker-compose.yml','utf8'));
  const vroom=parse(readFileSync('vroom-conf/config.yml','utf8'));
  const profile=profiles[mode],config=loadEngineConfig({});
  const request=optimizationRequest({...input,mode});
  const url=osrmUrl(config,'route',{mode,coordinates:[input.origin.coordinates,input.tasks[0]!.coordinates]});
  expect(url.port).toBe(String(profile.port));
  expect(compose.services[profile.service].ports).toContain(`${url.port}:5000`);
  expect(compose.services[profile.service].command).toContain(`/data/${profile.dataset}`);
  expect(vroom.routingServers.osrm[request.payload.vehicles[0]!.profile]).toEqual({host:profile.service,port:'5000'});
  expect(url.pathname).toContain('31.2357,30.0444;31.24,30.05');
  expect(request.payload.jobs[0]).toEqual({id:1,location:[31.24,30.05],service:600});
  expect(request.payload.vehicles[0]).not.toHaveProperty('end');
  expect(request.ids.get(2)?.taskId).toBe('customer-b');
});

const roadInput={mode:input.mode,coordinates:[input.origin.coordinates,input.tasks[0]!.coordinates]};
test('provider units and reversed solver order normalize to public IDs; candidate never proves policy',()=>{
  const result=optimizationResponse(input,optimizationFixture);
  assertRoutingCandidate(result,input.tasks.map(t=>t.taskId));
  expect(result.visits.map(v=>v.taskId)).toEqual(['customer-b','customer-a']);
  expect(result).toMatchObject({status:'complete',policyValidated:false,travelDurationSeconds:30,distanceMetres:300,customerServiceEstimateSeconds:1200,branchServiceEstimateSeconds:0,finishOffsetSeconds:1230});
  expect(JSON.stringify(result)).not.toContain('"vehicle"');
  const route=routeResponse(roadInput,routeFixture);
  expect(route).toMatchObject({durationSeconds:12.5,distanceMetres:345.6,geometrySource:'osrm-road'});
  expect(route.geometry[0]).toEqual({latitude:30.0444,longitude:31.2357});
  expect(tableResponse(roadInput,tableFixture).cells[0]![1]).toEqual({status:'reachable',durationSeconds:12.5,distanceMetres:345.6});
});
test.each(['unknown','duplicate','missing','unassigned-duplicate','wrong-location','violation','negative','missing-distance','time','vehicle','summary'])(
  'rejects %s optimization response',kind=>{
    const r=structuredClone(optimizationFixture),route=r.routes[0]!,job=route.steps[1]!;
    if(kind==='unknown')job.id=99;
    if(kind==='duplicate')job.id=1;
    if(kind==='missing')route.steps.splice(1,1);
    if(kind==='unassigned-duplicate')Object.assign(r,{unassigned:[{type:'job',id:2}],summary:{...r.summary,unassigned:1}});
    if(kind==='wrong-location')job.location=[30.06,31.25];
    if(kind==='violation')Object.assign(job,{violations:[{cause:'lead_time'}]});
    if(kind==='negative')route.duration=-1;
    if(kind==='missing-distance')Reflect.deleteProperty(route,'distance');
    if(kind==='time')job.arrival=999;
    if(kind==='vehicle')route.vehicle=2;
    if(kind==='summary')r.summary.service=600;
    expect(()=>optimizationResponse(input,r)).toThrow('invalid_response');
  }
);
test('partial/unassigned and unreachable data remain explicit, never fabricated travel',()=>{
  const r=structuredClone(optimizationFixture);
  r.routes[0]!.steps.splice(1,1);
  Object.assign(r.routes[0]!.steps[1]!,{arrival:30});Object.assign(r.routes[0]!.steps[2]!,{arrival:630});
  r.routes[0]!.service=600;r.summary.service=600;r.summary.unassigned=1;
  Object.assign(r,{unassigned:[{id:2,type:'job'}]});
  expect(optimizationResponse(input,r)).toMatchObject({status:'partial',unassignedTaskIds:['customer-b'],finishOffsetSeconds:630});
  const none={code:0,routes:[],unassigned:[{id:1,type:'job'},{id:2,type:'job'}],summary:{routes:0,unassigned:2,setup:0,service:0,duration:0,waiting_time:0,distance:0,violations:[]}};
  expect(optimizationResponse(input,none)).toMatchObject({status:'partial',visits:[],unassignedTaskIds:['customer-a','customer-b']});
  const table={...tableFixture,durations:[[0,null],[15,0]],distances:[[0,null],[400,0]]};
  expect(tableResponse(roadInput,table)).toMatchObject({status:'partial',cells:[[{status:'reachable'},{status:'unreachable'}],[{status:'reachable'},{status:'reachable'}]]});
  expect(()=>tableResponse(roadInput,{...table,distances:tableFixture.distances})).toThrow('invalid_response');
});
test('branch endpoint adds separate estimate after endpoint travel; fixed personal endpoint works',()=>{
  const branch:OptimizationInput={...input,accountKind:'company',endpoint:{kind:'branch',branchId:'branch-a',coordinates:{latitude:30.08,longitude:31.27},serviceEstimateSeconds:240}};
  const r=structuredClone(optimizationFixture);Object.assign(r.routes[0]!.steps[3]!,{location:[31.27,30.08],duration:40,distance:500,arrival:1240});
  Object.assign(r.routes[0]!,{duration:40,distance:500});Object.assign(r.summary,{duration:40,distance:500});
  expect(optimizationResponse(branch,r)).toMatchObject({customerServiceEstimateSeconds:1200,branchServiceEstimateSeconds:240,finishOffsetSeconds:1480});
  expect(optimizationResponse({...input,endpoint:{kind:'fixed',coordinates:branch.endpoint.kind==='branch'?branch.endpoint.coordinates:input.origin.coordinates}},r)).toMatchObject({branchServiceEstimateSeconds:0,finishOffsetSeconds:1240});
});
test('rejects malformed/missing route geometry, legs and table matrices or fallback cells',()=>{
  for(const raw of [null,{}, {code:'Ok'}, {...routeFixture,routes:[]},{...routeFixture,routes:[{...routeFixture.routes[0],geometry:null}]},
    {...routeFixture,routes:[{...routeFixture.routes[0],legs:[]}]},{...routeFixture,routes:[{...routeFixture.routes[0],duration:999}]}])expect(()=>routeResponse(roadInput,raw)).toThrow('invalid_response');
  for(const raw of [{...tableFixture,durations:[[0]]},{...tableFixture,distances:undefined},{...tableFixture,fallback_speed_cells:[[0,1]]}])expect(()=>tableResponse(roadInput,raw)).toThrow('invalid_response');
  expect(()=>routeResponse(roadInput,{code:'NoRoute'})).toThrow('no_route');
  expect(()=>tableResponse(roadInput,{code:'NoTable'})).toThrow('no_table');
  expect(()=>optimizationResponse(input,{code:3,error:'private host details'})).toThrow('provider_error');
});

async function controlled(handler:(req:IncomingMessage,res:ServerResponse)=>void,run:(engine:RoutingEngine,url:string)=>Promise<void>,options={}) {
  const server=createServer(handler);server.listen(0,'127.0.0.1');await once(server,'listening');
  const address=server.address();if(!address||typeof address==='string')throw new Error('listen');
  const url=`http://127.0.0.1:${address.port}`;
  const config=loadEngineConfig({});config.osrm.bicycle=url;config.vroom=url;
  try {await run(new RoutingEngine({...config,timeoutMs:250,maxConcurrent:1,...options}),url);}
  finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
test('real controlled HTTP sends private mapping and converts both providers',async()=>{
  let body='';const paths:string[]=[];
  await controlled((req,res)=>{
    paths.push(req.url!);
    if(req.method==='POST'){req.on('data',chunk=>{body+=String(chunk);});req.on('end',()=>res.end(JSON.stringify(optimizationFixture)));}
    else res.end(JSON.stringify(req.url!.startsWith('/route')?routeFixture:tableFixture));
  },async engine=>{
    expect((await engine.route(roadInput)).status).toBe('complete');
    expect((await engine.table(roadInput)).status).toBe('complete');
    expect((await engine.optimize(input)).visits[0]!.taskId).toBe('customer-b');
  },{timeoutMs:2000});
  expect(paths[0]).toContain('/route/v1/cycling/31.2357,30.0444;31.24,30.05');
  expect(paths[1]).not.toContain('fallback_speed');
  expect(JSON.parse(body).vehicles[0].profile).toBe('bike');expect(JSON.parse(body).jobs[0].service).toBe(600);
  expect(body).not.toContain('customer-a');expect(body).not.toContain('priority');
});
test('bounded timeout, saturation and cancellation release capacity; stalled response body times out',async()=>{
  let reply=false;
  await controlled((_req,res)=>{if(reply)res.end(JSON.stringify(routeFixture));else {res.writeHead(200,{'content-type':'application/json'});res.write('{');}},async engine=>{
    const pending=engine.route(roadInput);
    await expect(engine.route(roadInput)).rejects.toMatchObject({code:'busy'});
    await expect(pending).rejects.toMatchObject({code:'timeout'});
    const abort=new AbortController();const cancelled=engine.route(roadInput,abort.signal);abort.abort();
    await expect(cancelled).rejects.toMatchObject({code:'cancelled'});
    reply=true;expect((await engine.route(roadInput)).status).toBe('complete');
  });
});
test.each(['http','json','oversize','redirect'])('controlled %s failure has typed sanitized result',async kind=>{
  await controlled((_req,res)=>{
    if(kind==='http'){res.statusCode=503;res.end('private payload');}
    if(kind==='json')res.end('{bad');
    if(kind==='oversize')res.end('a'.repeat(1025));
    if(kind==='redirect'){res.statusCode=302;res.setHeader('Location','http://127.0.0.1:9/secret');res.end();}
  },async engine=>{
    try {await engine.route(roadInput);throw new Error('expected failure');}
    catch(error){expect(error).toMatchObject({code:kind==='http'?'http_error':kind==='redirect'?'unavailable':'invalid_response'});expect(JSON.stringify(error)).not.toMatch(/127\.0\.0\.1|private|secret/);}
  },{maxResponseBytes:1024});
});
test.each(['NoRoute','NoTable'])('HTTP 400 %s is preserved as unreachable provider data',async code=>{
  await controlled((_req,res)=>{res.statusCode=400;res.end(JSON.stringify({code}));},async engine=>{
    await expect(engine.route(roadInput)).rejects.toMatchObject({code:code==='NoRoute'?'no_route':'no_table',provider:'osrm'});
  });
});
test('network outage is typed; pre-cancelled request never consumes capacity',async()=>{
  let hits=0;
  await controlled((_req,res)=>{hits++;res.end(JSON.stringify(routeFixture));},async(engine,url)=>{
    const abort=new AbortController();abort.abort();
    await expect(engine.route(roadInput,abort.signal)).rejects.toMatchObject({code:'cancelled'});
    expect(hits).toBe(0);
    const unused=createServer();unused.listen(0,'127.0.0.1');await once(unused,'listening');
    const address=unused.address();if(!address||typeof address==='string')throw new Error('listen');
    await new Promise<void>(resolve=>unused.close(()=>resolve()));
    const config=loadEngineConfig({});config.osrm.bicycle=`http://127.0.0.1:${address.port}`;
    await expect(new RoutingEngine(config).route(roadInput)).rejects.toMatchObject({code:'unavailable'});
    expect(url).toContain('127.0.0.1');
  });
});
test('caller mutation while provider is pending cannot change validated ID reconciliation',async()=>{
  const mutable=structuredClone(input);
  await controlled((_req,res)=>res.end(JSON.stringify(optimizationFixture)),async engine=>{
    const pending=engine.optimize(mutable);mutable.tasks[0]!.taskId='changed-after-request';
    expect((await pending).visits.map(v=>v.taskId)).toEqual(['customer-b','customer-a']);
  });
});
test('configuration rejects mode collapse, credentials, paths, redirects through URL inputs, and unbounded settings',()=>{
  const c=loadEngineConfig({});
  for(const config of [{...c,osrm:{...c.osrm,bicycle:c.osrm.car}},{...c,vroom:'http://secret:pass@localhost:3000'},
    {...c,vroom:'http://localhost:3000/path'},{...c,timeoutMs:0},{...c,timeoutMs:Infinity},{...c,maxConcurrent:0},{...c,maxResponseBytes:0}]) {
    expect(()=>validateConfig(config)).toThrow('invalid_config');
  }
});
test('explicit endpoints preserve separate branch estimate and reject unsupported authority/origins',()=>{
  const branch:OptimizationInput={...input,accountKind:'company',endpoint:{kind:'branch',branchId:'branch-a',coordinates:{latitude:30.07,longitude:31.26},serviceEstimateSeconds:300}};
  expect(optimizationRequest(branch).payload.vehicles[0]!.end).toEqual([31.26,30.07]);
  expect(optimizationRequest(branch).payload.jobs.map(j=>j.service)).toEqual([600,600]);
  expect(()=>optimizationRequest({...input,tasks:[input.tasks[0]!,input.tasks[0]!]})).toThrow('invalid_input');
  expect(()=>optimizationRequest({...branch,accountKind:'personal'})).toThrow('invalid_input');
  expect(()=>validateModel('OptimizationInput',{...input,origin:{...input.origin,kind:'phone-outcome'}})).toThrow('invalid_input');
  expect(()=>validateModel('OptimizationInput',{...input,origin:{...input.origin,coordinates:[31.2357,30.0444]}})).toThrow('invalid_input');
});
