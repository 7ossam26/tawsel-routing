/** Disposable Docker HTTP fixtures only. No target services, auth tokens or ports. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

const fixtureImage = process.env.PROXY_FIXTURE_IMAGE;
const gatewayImage = process.env.PROXY_GATEWAY_IMAGE;
const webImage = process.env.PROXY_WEB_IMAGE;
for (const image of [fixtureImage, gatewayImage, webImage]) {
  assert.match(image ?? '', /^[a-z0-9./:_-]+@sha256:[a-f0-9]{64}$/u, 'Immutable smoke image required');
}
const prefix = `tawsel-proxy-smoke-${randomUUID()}`;
const network = `${prefix}-net`;
const oldIssuer = `${prefix}-issuer-old`, newIssuer = `${prefix}-issuer-new`;
const oldApi = `${prefix}-api-old`, newApi = `${prefix}-api-new`;
const gateway = `${prefix}-gateway`, web = `${prefix}-web`, probe = `${prefix}-probe`;
const containers = [oldIssuer, newIssuer, oldApi, newApi, gateway, web, probe];
function docker(args, optional = false) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 30_000, maxBuffer: 1_048_576, windowsHide: true });
  if (!optional) assert.equal(result.status, 0, `Docker smoke command failed: ${result.stderr || result.error?.message || args[0]}`);
  return result.stdout.trim();
}
const fixtureCookie = '__Host-fixture=fixture; Secure; HttpOnly; SameSite=Lax; Path=/';
const nodeFixture = (marker, port) => `require('node:http').createServer((q,s)=>{let body='';q.on('data',b=>body+=b);q.on('end',()=>{s.setHeader('Content-Type','application/json');${port === 3001 ? `s.setHeader('Set-Cookie',${JSON.stringify(fixtureCookie)});` : ''}s.end(JSON.stringify({marker:${JSON.stringify(marker)},url:q.url,method:q.method,body,headers:q.headers}));});}).listen(${port},'0.0.0.0')`;
function startBackend(name, ip, alias, port, marker) {
  docker(['run', '-d', '--name', name, '--network', network, '--network-alias', alias, '--ip', ip,
    '--memory', '64m', '--cpus', '0.25', fixtureImage, 'node', '-e', nodeFixture(marker, port)]);
}
function inspect(name) { return JSON.parse(docker(['inspect', name]))[0]; }
function request(front, path, method = 'GET', headers = {}) {
  const options = { method, headers: { Host: front === gateway ? 'auth.fixture.test' : 'app.fixture.test', ...headers } };
  if (method === 'POST') { options.body = 'fixture=a%20b'; options.headers['Content-Type'] = 'application/x-www-form-urlencoded'; }
  const js = `fetch(${JSON.stringify(`http://${front}:8080${path}`)},{...${JSON.stringify(options)},signal:AbortSignal.timeout(3000)}).then(async r=>console.log(JSON.stringify({status:r.status,text:await r.text(),headers:Object.fromEntries(r.headers)}))).catch(()=>process.exit(2))`;
  return JSON.parse(docker(['exec', probe, 'node', '-e', js]));
}
function responseBody(front, path, marker, method = 'GET') {
  const response = request(front, path, method);
  assert.equal(response.status, 200);
  const body = JSON.parse(response.text);
  assert.equal(body.marker, marker); assert.equal(body.url, path); assert.equal(body.method, method);
  assert.equal(body.body, method === 'POST' ? 'fixture=a%20b' : '');
  assert.equal(body.headers.host, front === gateway ? 'auth.fixture.test' : 'app.fixture.test');
  assert.equal(body.headers['x-forwarded-proto'], 'https'); assert.ok(body.headers['x-forwarded-for']);
  if (front === gateway) {
    assert.equal(body.headers['x-forwarded-host'], 'auth.fixture.test'); assert.equal(body.headers['x-forwarded-port'], '443');
  } else {
    assert.equal(response.headers['cache-control'], 'no-store'); assert.equal(response.headers['set-cookie'], fixtureCookie);
  }
}
async function ready(front) {
  for (let i = 0; i < 30; i++) {
    try { if (request(front, '/health').status === 200) return; } catch { /* Disposable startup only. */ }
    await setTimeout(100);
  }
  throw new Error('Proxy fixture startup failed');
}
async function recovered(front, path, marker) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try { responseBody(front, path, marker); return; } catch { /* Previous Docker DNS answer may remain valid for ten seconds. */ }
    await setTimeout(500);
  }
  throw new Error('Proxy did not refresh backend DNS within thirty seconds');
}
function unchanged(front, before) {
  const after = inspect(front);
  assert.equal(after.Id, before.Id); assert.equal(after.State.StartedAt, before.State.StartedAt); assert.equal(after.RestartCount, 0);
}
try {
  docker(['network', 'create', '--internal', network]);
  const net = JSON.parse(docker(['network', 'inspect', network]))[0];
  const [address, mask] = net.IPAM.Config[0].Subnet.split('/');
  assert.ok(Number(mask) <= 28 && Number(mask) >= 16, 'Fixture subnet must fit distinct static IPv4 addresses');
  // Docker accepts static endpoints only on an explicitly configured subnet.
  // Recreate only our still-empty network using Docker's unused allocation.
  assert.equal(Object.keys(net.Containers).length, 0);
  docker(['network', 'rm', network]);
  docker(['network', 'create', '--internal', '--subnet', net.IPAM.Config[0].Subnet, network]);
  const base = address.split('.').reduce((value, part) => value * 256 + Number(part), 0);
  const host = offset => [24, 16, 8, 0].map(shift => ((base + offset) >>> shift) & 255).join('.');
  startBackend(oldIssuer, host(10), 'issuer', 8080, 'issuer-old');
  startBackend(oldApi, host(12), 'api', 3001, 'api-old');
  docker(['run', '-d', '--name', probe, '--network', network, '--memory', '64m', '--cpus', '0.25',
    fixtureImage, 'node', '-e', 'setInterval(()=>{},1000)']);
  for (const [name, image] of [[gateway, gatewayImage], [web, webImage]]) {
    docker(['run', '--rm', '--network', network, image, 'nginx', '-t']);
    docker(['run', '-d', '--name', name, '--network', network, '--memory', '64m', '--cpus', '0.25', image]);
    await ready(name);
  }
  const beforeGateway = inspect(gateway), beforeWeb = inspect(web);
  for (const path of ['/admin', '/admin/master/console/', '/realms/master', '/realms/master/protocol/openid-connect/token', '/unexpected']) {
    assert.equal(request(gateway, path).status, 404, `Private issuer route leaked: ${path}`);
  }
  for (const path of ['/realms/tawsel-company/.well-known/openid-configuration?fixture=one%20two', '/resources/fixture/login/theme.css?v=1', '/.well-known/fixture?value=one%20two']) {
    responseBody(gateway, path, 'issuer-old');
  }
  responseBody(gateway, '/realms/tawsel-company/protocol/openid-connect/token?fixture=1', 'issuer-old', 'POST');
  responseBody(web, '/api/session/context?fixture=one%20two', 'api-old');
  responseBody(web, '/api/session/login?fixture=1', 'api-old', 'POST');
  assert.equal(request(web, '/internal/diagnostics/health').status, 404);
  const shell = request(web, '/'); assert.equal(shell.status, 200); assert.match(shell.text, /<html/u); assert.equal(shell.headers['cache-control'], 'no-cache');
  docker(['exec', web, 'sh', '-c', "mkdir -p /maps /retained/assets; printf '0123456789abcdef' > /maps/fixture.pmtiles; printf 'retained fixture' > /retained/assets/fixture.js; printf 'worker fixture' > /retained/workbox-fixture.js"]);
  const range = request(web, '/maps/fixture.pmtiles', 'GET', { Range: 'bytes=2-5' });
  assert.equal(range.status, 206); assert.equal(range.text, '2345'); assert.equal(range.headers['content-range'], 'bytes 2-5/16');
  assert.equal(range.headers['cache-control'], 'public, max-age=3600'); assert.equal(range.headers['x-content-type-options'], 'nosniff');
  for (const path of ['/assets/fixture.js', '/workbox-fixture.js']) {
    const asset = request(web, path); assert.equal(asset.status, 200); assert.equal(asset.headers['cache-control'], 'public, max-age=31536000, immutable');
  }
  assert.equal(request(web, '/assets/missing-fixture.js').status, 404);
  const sw = request(web, '/sw.js'); assert.equal(sw.status, 200); assert.equal(sw.headers['cache-control'], 'no-cache');
  docker(['rm', '-f', oldIssuer]); docker(['rm', '-f', oldApi]);
  startBackend(newIssuer, host(11), 'issuer', 8080, 'issuer-new');
  startBackend(newApi, host(13), 'api', 3001, 'api-new');
  assert.notEqual(host(10), host(11)); assert.notEqual(host(12), host(13));
  await recovered(gateway, '/realms/tawsel-company/.well-known/openid-configuration?after=replacement', 'issuer-new');
  await recovered(web, '/api/session/context?after=replacement', 'api-new');
  unchanged(gateway, beforeGateway); unchanged(web, beforeWeb);
  assert.equal(request(gateway, '/admin').status, 404); assert.equal(request(gateway, '/realms/master').status, 404);
  assert.equal(request(web, '/internal/diagnostics/health').status, 404);
  console.log('DEPLOYMENT_PROXY_DNS_AND_ROUTES_OK: real Nginx, distinct replacement issuer/API IPs, unchanged proxies, blocked administration/diagnostics, paths/query/POST/HTTPS/session headers/cache/map-range fixtures. Target OIDC/map datasets/TLS untested.');
} finally {
  for (const name of containers) docker(['rm', '-f', name], true);
  docker(['network', 'rm', network], true);
}
