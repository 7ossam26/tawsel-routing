import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import openapiTS, { astToString } from 'openapi-typescript';
import { parse } from 'yaml';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const namespace = 'https://schemas.tawsel.invalid/v1/';
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));

export async function loadContracts() {
  const schemas = {};
  async function visit(directory) {
    for (const entry of (await readdir(resolve(root, directory), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await visit(path);
      else if (entry.name.endsWith('.schema.json')) schemas[path.slice('contracts/'.length)] = await readJson(path);
    }
  }
  await visit('contracts');
  return {
    schemas,
    catalog: await readJson('contracts/operations.json'),
    api: parse(await readFile(resolve(root, 'contracts/openapi.yaml'), 'utf8')),
    examples: [...await readJson('contracts/examples/valid.json'), ...await readJson('contracts/examples/invalid.json')]
  };
}

export function resolveReference(bundle, reference, from = 'openapi.yaml') {
  const url = new URL(reference, new URL(from, namespace));
  if (!url.href.startsWith(namespace)) throw new Error(`Nonlocal schema reference: ${reference}`);
  const file = url.pathname.slice('/v1/'.length);
  let value = file === 'openapi.yaml' ? bundle.api : bundle.schemas[file];
  if (!value) throw new Error(`Missing reference file: ${reference}`);
  for (const encoded of url.hash.slice(2).split('/').filter(Boolean)) {
    const key = decodeURIComponent(encoded).replaceAll('~1', '/').replaceAll('~0', '~');
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) {
      throw new Error(`Missing reference target: ${reference}`);
    }
    value = value[key];
  }
  return value;
}

export function checkReferences(bundle) {
  function visit(value, file) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.$ref === 'string') resolveReference(bundle, value.$ref, file);
    for (const child of Object.values(value)) visit(child, file);
  }
  visit(bundle.api, 'openapi.yaml');
  for (const [file, schema] of Object.entries(bundle.schemas)) visit(schema, file);
  for (const example of bundle.examples) resolveReference(bundle, example.schema);
}

export function createValidator(bundle) {
  const ajv = new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false });
  addFormats(ajv);
  for (const [file, schema] of Object.entries(bundle.schemas)) {
    if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') throw new Error(`Wrong dialect: ${file}`);
    if (schema.$id !== namespace + file) throw new Error(`Wrong canonical identity: ${file}`);
    ajv.addSchema(schema);
  }
  for (const schema of Object.values(bundle.schemas)) {
    ajv.getSchema(schema.$id);
    for (const name of Object.keys(schema.$defs ?? {})) ajv.getSchema(`${schema.$id}#/$defs/${name}`);
  }
  return ajv;
}

export function validateExamples(bundle, ajv) {
  for (const example of bundle.examples) {
    const validate = ajv.getSchema(new URL(example.schema, namespace).href);
    if (!validate) throw new Error(`Unknown example schema: ${example.schema}`);
    const result = validate(example.data);
    if (result !== example.valid) throw new Error(`${example.id}: expected valid=${example.valid}; ${ajv.errorsText(validate.errors)}`);
    if (!example.valid && example.keyword && !validate.errors.some((error) => error.keyword === example.keyword)) {
      throw new Error(`${example.id}: did not fail for expected ${example.keyword}`);
    }
  }
}

export function checkCatalog(bundle, ajv) {
  const ids = new Set();
  const families = new Set();
  const capabilities = new Set([
    ...bundle.schemas['common.schema.json'].$defs.Capability.enum,
    'authenticated', 'public', 'local', 'internal', 'external-consumer', 'recipient-scope'
  ]);
  const idValidator = ajv.getSchema(`${namespace}common.schema.json#/$defs/OperationId`);
  for (const operation of bundle.catalog.operations) {
    if (!idValidator(operation.id) || ids.has(operation.id)) throw new Error(`Invalid/duplicate operation ID: ${operation.id}`);
    if (!Number.isInteger(operation.ownerPhase) || operation.ownerPhase < 1 || operation.ownerPhase > 42) throw new Error(`Missing/invalid owner: ${operation.id}`);
    if (!['http-read', 'http-command', 'event', 'local-ui', 'internal-work'].includes(operation.kind)) throw new Error(`Invalid boundary: ${operation.id}`);
    if (!['designed', 'implemented', 'verified-local'].includes(operation.lifecycle)) throw new Error(`Invalid lifecycle: ${operation.id}`);
    if (!capabilities.has(operation.capability)) throw new Error(`Unknown capability: ${operation.id}`);
    if (typeof operation.description !== 'string' || !operation.description.trim()) throw new Error(`Missing action description: ${operation.id}`);
    ids.add(operation.id);
    families.add(operation.family);
  }
  // Independent checklist from master-plan section 13, not inferred from catalog rows.
  for (const family of ['session-context', 'integration-provisioning', 'intake', 'locations', 'planning', 'execution', 'returns', 'monitoring-history', 'sync-recovery', 'reporting']) {
    if (!families.has(family)) throw new Error(`Missing master-plan family: ${family}`);
  }
  for (const item of Object.values(bundle.api.paths)) {
    for (const operation of Object.values(item)) {
      if (!operation?.operationId) continue;
      const entry = bundle.catalog.operations.find((candidate) => candidate.id === operation.operationId);
      if (!entry || entry.lifecycle === 'designed') throw new Error(`Unimplemented operation exposed in public paths: ${operation.operationId}`);
    }
  }
  for (const example of bundle.examples.filter((entry) => entry.valid)) {
    const id = example.data?.operationId ?? example.data?.eventType;
    if (!id) continue;
    const operation = bundle.catalog.operations.find((candidate) => candidate.id === id);
    const kind = example.data.eventType ? 'event' : 'http-command';
    if (!operation || operation.kind !== kind) throw new Error(`Unowned ${kind} example: ${id}`);
  }
}

export async function generateArtifacts(bundle) {
  bundle ??= await loadContracts();
  checkReferences(bundle);
  const types = '// Generated by npm run contracts:generate. P07 session endpoints; other business operations remain designed.\n' + astToString(await openapiTS(pathToFileURL(resolve(root, 'contracts/openapi.yaml')), { alphabetize: true }));
  const lines = [
    '# Tawsel public contract reference', '',
    'Generated from canonical OpenAPI 3.1.1 / JSON Schema 2020-12 by `npm run contracts:generate`.', '',
    '**P07 browser session endpoints are implemented locally.** See [identity setup and browser quickstart](../identity.md) and [P07 evidence](../phase-07-evidence.md). Other domain HTTP operations/events remain designed and unavailable. Workspace `/health` is excluded. No production release or real ERP interoperability is claimed.', '',
    '[State model](../tracking-and-consistency.md) · [Operation ownership](../contract-coverage.md) · [UI action mapping (designed)](../ui-actions.md) · [Integration guide](../integration-guide.md) · [Canonical OpenAPI](../../contracts/openapi.yaml)', '',
    'Envelope payload objects are deliberately extensible at this stage. Feature owners must add exact versioned payload schemas and cross-field/domain checks before handlers. A valid envelope is not an accepted command. TypeScript types cannot enforce numeric bounds, formats or all conditional rules.', '',
    'P05 verifies the PostgreSQL kernel and retained ActionResult. P06 verifies membership, capability overrides and resource guards; P07 binds real OIDC sessions to those guards. AccessContext is a display snapshot, never request authority. Result/provisioning HTTP adapters remain later work. See [P05 evidence](../phase-05-evidence.md), [permission contract](../authorization.md) and [session contract](../identity.md).', '',
    '## Common schemas and envelopes', ''
  ];
  for (const [name, entry] of Object.entries(bundle.api.components.schemas)) {
    const schema = resolveReference(bundle, entry.$ref);
    lines.push(`### ${name}`, '', `[Canonical definition](../../contracts/${entry.$ref.replace(/^\.\//, '')})`, '');
    if (schema.description) lines.push(schema.description, '');
    // Including the actual resolved schema retains numeric bounds, conditional rules,
    // required fields and references instead of maintaining a second hand-written model.
    lines.push('```json', JSON.stringify(schema, null, 2), '```', '');
  }
  lines.push('## Validated examples', '', 'All are designed examples. Invalid cases are rejection fixtures, not requests to a live service.', '', '| Example | Schema | Expected |', '| --- | --- | --- |');
  for (const example of bundle.examples) lines.push(`| ${example.id} | ${example.schema} | ${example.valid ? 'valid foundation shape' : `invalid (${example.keyword})`} |`);
  lines.push('', '[Canonical example data](../../contracts/examples/README.md)', '');
  const phaseFiles = await readdir(resolve(root, 'docs/phases'));
  const coverage = [
    '# Canonical operation ownership and coverage', '',
    'Generated from [contracts/operations.json](../contracts/operations.json) by `npm run contracts:generate`.', '',
    '**P07 session/context and issuer-hosted account journeys are implemented locally; each row records its actual lifecycle.** Other domain operations/events remain designed and unavailable. [Identity setup/evidence](identity.md) identifies application HTTP paths versus issuer-hosted actions. No generic CRUD endpoint replaces explicit actions.', '',
    '`designed` means specification only; `implemented` requires an actual handler/producer; `verified-local` additionally requires recorded local evidence. Neither means deployed or interoperable with a real ERP. Events are produced by the feature owner listed; P25 transports committed intent and P26 verifies the external receiver.', '',
    'P05/P06 foundations: PostgreSQL command/retention and tenant/capability/resource authorization are verified internally. The catalog authorizationFoundation records the P06 evidence and canonical shared schemas. action.getResult remains designed as an HTTP operation: P07 supplies session authentication; its future adapter must recheck resource visibility before disclosing retained details. No domain command/event is promoted; see [P05 evidence](phase-05-evidence.md), [P06 evidence](phase-06-evidence.md) and [permission contract/guard inputs](authorization.md).', '',
    'Operation IDs are stable protocol identifiers, not live URLs. Paths/methods are intentionally unassigned until their owner defines a complete operation. Local UI actions invoke no business mutation by themselves; internal-work rows are not public endpoints. The external consumer/source rows belong to the separate ERP process.', '',
    '[UI action coverage](ui-actions.md) maps every catalog entry to role/state, page or focused overlay, feedback and connected UI phase. [UI specification](ui-spec.md) and [reference audit](ui-reference-audit.md) define requirement-driven additions/removals and Arabic state acceptance. These are designed surfaces, not working endpoints or browser evidence; [Phase 03 evidence](phase-03-evidence.md) records the document checks.', '',
    'The Capability column names the scoped capability family. For own-driver reads, planning and locations, `execution.own` is an explicit server-policy alternative to staff `monitor.read`, `planning.manage` or `location.review`, constrained to that driver’s authorized work. Predeparture staff authority never implies postdeparture execution authority. `authenticated`, `public`, `local`, `internal`, `external-consumer` and `recipient-scope` denote boundary contexts, not configurable role grants. P06 implements reusable enforcement; P07 establishes real authentication; P08 still owns provisioning and each feature supplies locked lifecycle predicates. The [permission table](authorization.md) and [authority tables](tracking-and-consistency.md) remain binding.', '',
    '## Master-plan family review', '',
    '| Master plan §13 family | Catalog family | Review result / additional owners |',
    '| --- | --- | --- |',
    '| Session/context | session-context | Company resolution, separate identity, recovery/status, effective context, refresh/logout; P35 queue-safe exit |',
    '| Integration provisioning | integration-provisioning | Source binding/rotation/disable, branches, users, role/overrides/memberships, driver and issuer status |',
    '| Intake | intake | Independent intake plus source snapshot, prepared/received batch, withdraw/reassign and predeparture urgency |',
    '| Locations | locations | Candidate search, original/pin/provenance reads and confirmation; public coordinates never Engine arrays |',
    '| Planning | planning | Draft inputs/preview, jobs, manual plan, replan, forecast/route reads; round.start owns initial publication |',
    '| Execution | execution | Start, heading/change/arrival, each outcome, whole deferral/retry, driver urgency, end round/day, takeover/correction/adoption |',
    '| Returns | returns | Source groups, request/status, actual subset receipt, disposition, interruption/resume and new cycle |',
    '| Monitoring/history | monitoring-history | Driver/trip coherent reads, held/prepared, task/attempt/workday history, recipient-scoped projection |',
    '| Sync/recovery | sync-recovery | Stable action result, old-device evidence, replay/dependencies/conflicts, signed delivery/admin, applied checkpoints, gap/expiry reconciliation, external inbox/outbox |',
    '| Reporting | reporting | Workday/round timing, filter/snapshot-equivalent export job/status/download |',
    '',
    'Additional §9/§17 operations are private routing, map assets and owner diagnostics; §11 local capture/update actions appear explicitly. Source administrative screens in the native mock call the provisioning/intake/receipt commands above through P27’s durable source outbox. Prepared-to-received is never hidden inside an update task operation. Save-preview and server-confirmed start stay separate; current change uses explicit heading selection; end-day performs closure/carry-forward without a second silent command.', '',
    '## Operation and event inventory', ''
  ];
  for (const family of [...new Set(bundle.catalog.operations.map((operation) => operation.family))]) {
    coverage.push(`### ${family}`, '', '| Stable ID | Boundary | Lifecycle | Owner | Capability / scope | Action or fact |', '| --- | --- | --- | --- | --- | --- |');
    for (const operation of bundle.catalog.operations.filter((entry) => entry.family === family)) {
      const phaseFile = phaseFiles.find((file) => file.startsWith(`${String(operation.ownerPhase).padStart(2, '0')}-`));
      if (!phaseFile) throw new Error(`Missing owner phase for ${operation.id}`);
      coverage.push(`| \`${operation.id}\` | ${operation.kind} | ${operation.lifecycle} | [P${String(operation.ownerPhase).padStart(2, '0')}](phases/${phaseFile}) | ${operation.capability} | ${operation.description} |`);
    }
    coverage.push('');
  }
  coverage.push('## Contradictions, naming and remaining proof', '',
    'The §5–15/18–20 review found no unresolved concrete product contradiction after applying the decision map. D-73 staff correction is superseded by D-91/D-95/D-96; D-68 receipt-before-resume and D-80 confirmed-subset continuation coexist. `trip` and `round` name the same resource; task/cycle/assignment/attempt remain different. These are terminology resolutions, not new permissions.', '',
    'Full-capacity branch interruption remains the explicitly labelled master-plan proposal for P22 to verify. Signing/header details (P25), trusted actor binding (P08), feature payload schemas (each owner), replay/retention implementation (P25–26/P34–35), target service configuration and real ERP choices remain concrete future work. The legacy README Engine examples do not override the application’s 600-second service default or complete route validation.', '',
    'No V1 GPS, billing, call counter, advanced POD, direct driver transfer, settlement, ERP schema coupling or B2C splitting/custody operation is present. [Integration guide](integration-guide.md) and [ERP planning index](erp/README.md) explain the unreleased boundary. [Phase evidence](phase-02-evidence.md) records verification separately.', '');
  return new Map([
    ['packages/api-client/src/schema.d.ts', types.replaceAll('\r\n', '\n')],
    ['docs/reference/public-contract.md', lines.join('\n')],
    ['docs/contract-coverage.md', coverage.join('\n')]
  ]);
}

async function main() {
  const mode = process.argv[2] ?? 'check';
  if (!['check', 'generate', 'demo'].includes(mode)) throw new Error(`Unknown mode: ${mode}`);
  const bundle = await loadContracts();
  checkReferences(bundle);
  const ajv = createValidator(bundle);
  validateExamples(bundle, ajv);
  checkCatalog(bundle, ajv);
  const outputs = await generateArtifacts(bundle);
  for (const [path, content] of outputs) {
    if (mode === 'generate') {
      await mkdir(dirname(resolve(root, path)), { recursive: true });
      await writeFile(resolve(root, path), content);
    } else if (await readFile(resolve(root, path), 'utf8') !== content) {
      throw new Error(`Generated artifact drift: ${path}; run npm run contracts:generate`);
    }
  }
  console.log(`PASS: ${Object.keys(bundle.schemas).length} canonical schema files; ${bundle.examples.filter((e) => e.valid).length} valid and ${bundle.examples.filter((e) => !e.valid).length} invalid examples; ${bundle.catalog.operations.length} owned operations/events/local actions; references and generated artifacts ${mode === 'generate' ? 'written' : 'checked'}.`);
  if (mode === 'demo') {
    console.log('Designed demonstration: 3 pieces × EGP 100 + shipping 50; 2 delivered => 25000 minor units; 1 held return-required; return request => zero receipt. See docs/tracking-and-consistency.md for correction/subset/redispatch. No business endpoint or transaction executed.');
    console.log('Public consumer: packages/api-client/examples/consumer.ts. Future HTTP/receiver conformance: P26–27.');
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
