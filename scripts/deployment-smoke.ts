import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout } from 'node:timers/promises';
import { createTestDatabase } from '../apps/api/test/support/database.js';
import { createDatabasePool } from '../apps/api/src/db/pool.js';
import { migrate } from '../apps/api/src/db/migrate.js';
import { buildApp } from '../apps/api/src/app.js';
import { retainAssets } from './deployment-assets.js';

// Real Nginx + real API/PostgreSQL, disposable resources. Map bytes are a labelled
// HTTP range fixture; this does not claim a Cairo dataset or target TLS result.
const binary = process.env.TAWSEL_NGINX_BINARY;
if (!binary) throw new Error('Set TAWSEL_NGINX_BINARY to a verified local Nginx executable');
const root = await mkdtemp(join(tmpdir(), 'tawsel-http-'));
const db = await createTestDatabase();
const api = buildApp(createDatabasePool(db.config));
let child: ReturnType<typeof spawn> | undefined;
try {
  await migrate(db.pool);
  await api.listen({ host: '127.0.0.1', port: 0 });
  const address = api.server.address(); assert(address && typeof address !== 'string');
  const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const reserved = socket.address(); assert(reserved && typeof reserved !== 'string');
  const port = reserved.port; await new Promise<void>(r => socket.close(() => r()));
  await cp('apps/web/dist', join(root, 'web'), { recursive: true });
  await mkdir(join(root, 'maps')); await mkdir(join(root, 'logs')); await mkdir(join(root, 'temp'));
  await writeFile(join(root, 'maps/cairo.pmtiles'), Buffer.from('0123456789abcdef'));
  await retainAssets(join(root, 'web'), join(root, 'retained'));
  await writeFile(join(root, 'retained/assets/previous-release.js'), 'retained previous release');
  const path = (name: string) => '"' + join(root, name).replaceAll('\\', '/') + '"';
  let config = await readFile('deploy/nginx.conf', 'utf8');
  config = config.replace('listen 8080;', `listen 127.0.0.1:${port};`)
    .replace('http://api:3001', `http://127.0.0.1:${address.port}`)
    .replace('/usr/share/nginx/html', path('web')).replace('/maps/;', path('maps') .replace(/"$/, '/"') + ';')
    .replaceAll('/retained;', path('retained') + ';');
  await writeFile(join(root, 'nginx.conf'), `daemon off;\nworker_processes 1;\npid nginx.pid;\nevents { worker_connections 128; }\nhttp { default_type application/octet-stream;\n${config}\n}`);
  child = spawn(resolve(binary), ['-p', root.replaceAll('\\', '/') + '/', '-c', 'nginx.conf'], { windowsHide: true, stdio: 'pipe' });
  let diagnostics = ''; child.stderr?.on('data', b => { diagnostics += String(b); });
  child.on('error', () => { diagnostics += 'Nginx process could not start'; });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base + '/health')).ok) { ready = true; break; } } catch { /* Startup only. */ }
    await setTimeout(100);
  }
  if (!ready) {
    try { diagnostics += await readFile(join(root, 'logs/error.log'), 'utf8'); } catch { /* No log when executable cannot start. */ }
  }
  assert(ready, diagnostics || `Nginx startup timed out (exit ${child.exitCode})`);
  const index = await fetch(base + '/'); assert.equal(index.status, 200); assert.match(await index.text(), /<html/);
  const range = await fetch(base + '/maps/cairo.pmtiles', { headers: { Range: 'bytes=2-5' } });
  assert.equal(range.status, 206); assert.equal(range.headers.get('content-range'), 'bytes 2-5/16'); assert.equal(await range.text(), '2345');
  assert.equal((await fetch(base + '/maps/cairo.pmtiles', { headers: { Range: 'bytes=40-50' } })).status, 416);
  const old = await fetch(base + '/assets/previous-release.js'); assert.equal(await old.text(), 'retained previous release'); assert.match(old.headers.get('cache-control') ?? '', /immutable/);
  assert.equal((await fetch(base + '/assets/missing.js')).status, 404);
  assert.equal((await fetch(base + '/internal/diagnostics/health')).status, 404);
  const sw = await fetch(base + '/sw.js'); assert.equal(sw.status, 200); assert.equal(sw.headers.get('cache-control'), 'no-cache');
  const proxied = await fetch(base + '/api/no-such-route'); assert.equal(proxied.status, 404); assert.equal((await proxied.json() as { error: { code: string } }).error.code, 'route_not_found');
  await mkdir('.local', { recursive: true });
  await writeFile('.local/phase-39-http.json', JSON.stringify({ verifiedAt: new Date().toISOString(), nginx: 'operator-supplied binary', database: 'real disposable PostgreSQL', map: '16-byte range fixture', results: ['production shell', '206 exact range', '416 invalid range', 'retained old asset', 'missing asset 404', 'private diagnostics 404', 'uncached worker', 'real API proxy'], tls: 'unrun' }, null, 2));
  console.log('Deployment HTTP smoke: 8 checks passed; real Nginx/API/PostgreSQL, fixture map bytes, TLS unrun.');
} finally {
  if (child && child.exitCode === null && child.pid) {
    const exited = once(child, 'exit');
    const stop = spawn(resolve(binary), ['-p', root.replaceAll('\\', '/') + '/', '-c', 'nginx.conf', '-s', 'quit'], { windowsHide: true, stdio: 'ignore' });
    await once(stop, 'exit');
    await Promise.race([exited, setTimeout(5000)]);
    if (child.exitCode === null) { child.kill(); await exited; }
  }
  await api.close(); await db.close(); await rm(root, { recursive: true, force: true });
}
