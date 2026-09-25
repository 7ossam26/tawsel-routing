import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parse } from 'yaml';

// Packaging only: this does not certify deployment or refresh curated business prose.
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = 'docs/erp/planning-pack';
const output = resolve(root, directory);
const sha = (data) => createHash('sha256').update(data).digest('hex');
const read = (path) => readFile(resolve(root, path));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const commit = git('rev-parse', 'HEAD');
const generatedAt = new Date().toISOString();
const sources = new Map();
const remember = async (path) => {
  if (!sources.has(path)) sources.set(path, await read(path));
  return sources.get(path);
};
const sourceText = async (path) => (await remember(path)).toString('utf8');
const walk = async (path) => {
  const files = [];
  for (const entry of (await readdir(resolve(root, path), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) files.push(...await walk(`${path}/${entry.name}`));
    else if (entry.isFile()) files.push(`${path}/${entry.name}`);
  }
  return files;
};
const contractPaths = await walk('contracts');
for (const path of contractPaths) await remember(path);
const api = parse(await sourceText('contracts/openapi.yaml'));
const catalog = JSON.parse(await sourceText('contracts/operations.json'));
const byId = new Map(catalog.operations.map((op) => [op.id, op]));
const sender = JSON.parse(await sourceText('contracts/events/sender-event.v1.schema.json'));
const valid = JSON.parse(await sourceText('contracts/examples/valid.json'));
const invalid = JSON.parse(await sourceText('contracts/examples/invalid.json'));
const client = JSON.parse(await sourceText('packages/api-client/package.json'));
const escape = (s) => String(s ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const header = (title) => `# ${title}\n\nSource commit: \`${commit}\`. Extracted: ${generatedAt}.\n\nOriginal blocks below are verbatim source text, not rewritten contracts. Their SHA-256 hashes refer to original bytes. Resolve relative schema references using the original path above the block and the companion schema attachment. No repo/network access is needed to read those blocks. Descriptions/fixtures do not override operation authentication or lifecycle.\n\n`;
const block = async (path, language) => {
  const bytes = await remember(path);
  const content = bytes.toString('utf8');
  if (content.includes('````')) throw new Error(`Unexpected Markdown fence in ${path}`);
  return `## Original file: ${path}\n\nSHA-256: \`${sha(bytes)}\` · Bytes: ${bytes.length}.\n\n<!-- SOURCE-BEGIN ${path} -->\n\`\`\`\`${language}\n${content}\n\`\`\`\`\n<!-- SOURCE-END ${path} -->\n\n`;
};

const entries = [];
for (const [path, item] of Object.entries(api.paths)) {
  for (const [method, operation] of Object.entries(item)) {
    if (!operation || typeof operation !== 'object' || !operation.operationId) continue;
    const owner = byId.get(operation.operationId);
    if (!owner) throw new Error(`Uncatalogued operation ${operation.operationId}`);
    const security = operation.security ?? api.security ?? [];
    const names = [...new Set(security.flatMap((s) => Object.keys(s)))];
    const reference = names.some((n) => ['ReceiverStatus', 'WebhookSignature'].includes(n));
    const category = reference ? 'External ERP/reference consumer server'
      : names.includes('ProvisioningService') ? 'Tawsel ERP service'
      : names.includes('ProvisioningOperator') ? 'Tawsel operator bootstrap'
      : names.some((n) => /Session$/.test(n)) ? 'Tawsel human session'
      : names.length === 0 ? 'Tawsel public/account entry' : 'Review authentication';
    if (category === 'Review authentication') throw new Error(`Unclassified authentication: ${operation.operationId}`);
    entries.push({ id: operation.operationId, method: method.toUpperCase(), path, category, names, lifecycle: owner.lifecycle, capability: owner.capability });
  }
}
entries.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
let http = header('Canonical HTTP, authentication and operation reference');
http += `## Host and authority index\n\n${entries.length} bound HTTP operations below. Alternatives in the authentication column are OpenAPI alternatives, not blanket permission: current capability, resource, actor and lifecycle checks still apply. The three external receiver/source endpoints run on the consumer base URL. A service credential cannot call a human endpoint. The complete catalog additionally contains events/local actions/unbound operations.\n\n`;
http += '| Operation ID | Method and path | Server / caller category | Authentication alternatives | Capability | Lifecycle |\n| --- | --- | --- | --- | --- | --- |\n';
for (const e of entries) http += `| ${escape(e.id)} | ${e.method} ${escape(e.path)} | ${e.category} | ${e.names.join(' OR ') || 'public'} | ${escape(e.capability)} | ${e.lifecycle} |\n`;
http += '\n## Closed emitted-event payload mapping\n\nUse this list for sender event types, not the broader generic envelope or fixture catalog.\n\n| Event type | Kind | Payload version | Original payload reference (relative to contracts/events/) |\n| --- | --- | --- | --- |\n';
for (const branch of sender.oneOf) {
  const p = branch.properties;
  http += `| ${p.eventType.const} | ${p.eventKind.const} | ${p.payloadVersion.const} | ${p.payload.$ref} |\n`;
}
http += '\n' + await block('contracts/openapi.yaml', 'yaml') + await block('contracts/operations.json', 'json');
const schemaPaths = contractPaths.filter((p) => p.endsWith('.schema.json'));
let schemas = header('Complete canonical JSON Schemas');
schemas += `## File index\n\n${schemaPaths.length} complete schemas. Each schema is embedded once below. Feature schemas can be stricter than common foundations.\n\n| Original file | Definition count | SHA-256 |\n| --- | --- | --- |\n`;
for (const path of schemaPaths) {
  const bytes = await remember(path);
  const schema = JSON.parse(bytes.toString('utf8'));
  schemas += `| ${path} | ${Object.keys(schema.$defs ?? {}).length} | ${sha(bytes)} |\n`;
}
schemas += '\n';
for (const path of schemaPaths) schemas += await block(path, 'json');
let examples = header('Complete canonical examples and webhook signature vector');
examples += `## Fixture index\n\n${valid.length} acceptance examples and ${invalid.length} rejection examples. These are schema fixtures, not proof that every shown operation/event is emitted or callable by an ERP service. Read the authentication and sender index in 04 first. The signature vector contains an explicitly public test key, not a production secret.\n\n| Set | Example ID | Original schema reference | Expected invalid keyword |\n| --- | --- | --- | --- |\n`;
for (const [kind, values] of [['valid', valid], ['invalid', invalid]]) for (const e of values) examples += `| ${kind} | ${escape(e.id)} | ${escape(e.schema)} | ${escape(e.keyword)} |\n`;
examples += '\n';
for (const path of contractPaths.filter((p) => p.startsWith('contracts/examples/'))) examples += await block(path, path.endsWith('.json') ? 'json' : 'markdown');

// Verify references against the complete original file set, without changing schemas.
const validateRefs = (value, path) => {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === '$ref' && typeof child === 'string') {
      const base = new URL(path, 'https://package.invalid/');
      const target = new URL(child, base);
      let targetPath;
      if (target.host === 'package.invalid') targetPath = decodeURIComponent(target.pathname.slice(1));
      else if (target.host === 'schemas.tawsel.invalid') targetPath = `contracts/${target.pathname.replace(/^\/v1\//, '')}`;
      else throw new Error(`External reference unavailable in package: ${path}: ${child}`);
      if (!sources.has(targetPath)) throw new Error(`Missing reference: ${path}: ${child}`);
      let doc = targetPath.endsWith('.yaml') ? api : JSON.parse(sources.get(targetPath).toString('utf8'));
      const fragment = decodeURIComponent(target.hash.slice(1));
      if (fragment) {
        if (!fragment.startsWith('/')) throw new Error(`Unsupported anchor: ${child}`);
        for (const part of fragment.slice(1).split('/').map((x) => x.replaceAll('~1', '/').replaceAll('~0', '~'))) {
          if (doc === null || typeof doc !== 'object' || !(part in doc)) throw new Error(`Missing fragment: ${path}: ${child}`);
          doc = doc[part];
        }
      }
    } else validateRefs(child, path);
  }
};
validateRefs(api, 'contracts/openapi.yaml');
for (const path of schemaPaths) validateRefs(JSON.parse((await remember(path)).toString('utf8')), path);
await mkdir(output, { recursive: true });
const generated = new Map([
  ['04-CANONICAL-HTTP.md', http], ['05-CANONICAL-SCHEMAS.md', schemas], ['06-CANONICAL-EXAMPLES.md', examples],
]);
for (const [name, content] of generated) await writeFile(resolve(output, name), content, 'utf8');
// Confirm every embedded original remains byte-exact after writing the attachment.
for (const [name] of generated) {
  const text = await readFile(resolve(output, name), 'utf8');
  const regex = /<!-- SOURCE-BEGIN ([^\r\n]+) -->\n````[^\n]*\n([\s\S]*?)\n````\n<!-- SOURCE-END \1 -->/g;
  let count = 0;
  for (const match of text.matchAll(regex)) {
    if (!Buffer.from(match[2], 'utf8').equals(sources.get(match[1]))) throw new Error(`Changed embedded source ${match[1]}`);
    count++;
  }
  const expected = name.startsWith('04') ? 2 : name.startsWith('05') ? schemaPaths.length : contractPaths.filter((p) => p.startsWith('contracts/examples/')).length;
  if (count !== expected) throw new Error(`Incomplete embedded sources in ${name}: ${count}/${expected}`);
}

const provenance = [
  'docs/erp/ERP-PLANNING-INPUT.md', 'docs/erp/field-and-status-mapping.md', 'docs/erp/consumer-quickstart.md',
  'docs/erp/source-protocol.md', 'docs/erp/receiver-protocol.md', 'docs/tracking-and-consistency.md',
  'docs/provisioning.md', 'docs/outbox-delivery.md', 'docs/reporting.md', 'docs/implementation-status.md',
];
for (const path of provenance) await remember(path);
const sourceMetadata = [...sources].map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) })).sort((a,b) => a.path.localeCompare(b.path));
const packageFiles = (await readdir(output)).filter((name) => name.endsWith('.md')).sort();
const artifacts = [];
for (const name of packageFiles) { const bytes = await readFile(resolve(output, name)); artifacts.push({ path: name, bytes: bytes.length, sha256: sha(bytes) }); }
const previousPath = resolve(output, 'planning-manifest.json');
let previous;
try { previous = JSON.parse(await readFile(previousPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const oldHashes = new Map((previous?.sourceFiles ?? []).map((f) => [f.path, f.sha256]));
const changedSources = previous ? sourceMetadata.filter((f) => oldHashes.get(f.path) !== f.sha256).map((f) => f.path) : [];
const manifest = {
  kind: 'erp-planning-reference', generatedAt, sourceCommit: commit,
  sourceWorkingTreeChanges: git('status', '--porcelain', '--', ...sourceMetadata.map((f) => f.path)),
  clientVersion: client.version,
  counts: { schemas: schemaPaths.length, validExamples: valid.length, invalidExamples: invalid.length, catalogEntries: catalog.operations.length, boundHttpOperations: entries.length, senderEventMappings: sender.oneOf.length },
  notice: 'Packaging checks preserve canonical bytes and reference closure. They do not review business prose or certify runtime/deployment. Review changed sources using REFRESH-BEFORE-SENDING.md before sending an updated package.',
  changedSourcesSincePreviousBuild: changedSources,
  sourceFiles: sourceMetadata, artifacts,
};
await writeFile(previousPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

// Python standard library only; paths are constants under this workspace, no shell interpolation.
const python = String.raw`from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json, hashlib
root=Path.cwd()
pack=root/'docs/erp/planning-pack'
manifest=json.loads((pack/'planning-manifest.json').read_text(encoding='utf-8'))
archive=pack/'TAWSEL-ERP-PLANNING-PACK.zip'
with ZipFile(archive,'w',compression=ZIP_DEFLATED) as z:
 for entry in manifest['artifacts']:
  z.write(pack/entry['path'],entry['path'])
 z.write(pack/'planning-manifest.json','planning-manifest.json')
 for entry in manifest['sourceFiles']:
  if entry['path'].startswith('contracts/'):
   z.write(root/entry['path'],'canonical/'+entry['path'])
with ZipFile(archive) as z:
 assert z.testzip() is None
 for entry in manifest['artifacts']:
  assert hashlib.sha256(z.read(entry['path'])).hexdigest()==entry['sha256']
 for entry in manifest['sourceFiles']:
  if entry['path'].startswith('contracts/'):
   assert hashlib.sha256(z.read('canonical/'+entry['path'])).hexdigest()==entry['sha256']
print('Archive verified:',archive.name)
`;
execFileSync('python', ['-X', 'utf8', '-c', python], { cwd: root, stdio: 'inherit' });
console.log(JSON.stringify({ sourceCommit: commit, ...manifest.counts, attachmentFiles: artifacts.filter((a) => /^0[1-7]-/.test(a.path)).map((a) => ({ path: a.path, bytes: a.bytes })), changedSourcesSincePreviousBuild: changedSources, result: 'Embedded bytes, schema reference closure, manifest and ZIP verified.' }, null, 2));
