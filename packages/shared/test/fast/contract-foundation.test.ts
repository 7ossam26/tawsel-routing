import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkCatalog, checkReferences, createValidator, generateArtifacts, loadContracts,
  namespace, resolveReference, root, validateExamples
} from '../../../../scripts/contracts.mjs';

const bundle = await loadContracts();
const ajv = createValidator(bundle);

describe('canonical public contract foundation (schema evidence, not business execution)', () => {
  it('resolves every real OpenAPI, schema and example reference locally', () => {
    checkReferences(bundle);
    expect(Object.keys(bundle.api.components.schemas)).toEqual(expect.arrayContaining(['Money', 'ActionEnvelope', 'EventEnvelope', 'EvidenceReceipt']));
    // No hand-copied common OpenAPI schemas that can drift from the canonical file.
    for (const entry of Object.values(bundle.api.components.schemas)) {
      expect(Object.keys(entry as object)).toEqual(['$ref']);
    }
  });

  it('detects a broken external-file reference and a broken fragment', () => {
    expect(() => resolveReference(bundle, './missing.schema.json')).toThrow('Missing reference file');
    expect(() => resolveReference(bundle, './common.schema.json#/$defs/Missing')).toThrow('Missing reference target');
    const broken = structuredClone(bundle);
    broken.api.components.schemas.Money.$ref = './common.schema.json#/$defs/Missing';
    expect(() => checkReferences(broken)).toThrow('Missing reference target');
  });

  it('uses 2020-12 explicitly and refuses a mismatched schema dialect', () => {
    expect(bundle.api.openapi).toBe('3.1.1');
    expect(bundle.api.jsonSchemaDialect).toBe('https://json-schema.org/draft/2020-12/schema');
    const broken = structuredClone(bundle);
    broken.schemas['common.schema.json'].$schema = 'http://json-schema.org/draft-07/schema#';
    expect(() => createValidator(broken)).toThrow('Wrong dialect');
  });

  for (const example of bundle.examples) {
    it(`${example.id}: ${example.valid ? 'accepts' : 'rejects'} the actual example${example.keyword ? ` (${example.keyword})` : ''}`, () => {
      const validate = ajv.getSchema(new URL(example.schema, namespace).href)!;
      const before = structuredClone(example.data);
      expect(validate(example.data), ajv.errorsText(validate.errors)).toBe(example.valid);
      if (!example.valid) expect(validate.errors?.map((error) => error.keyword)).toContain(example.keyword);
      expect(example.data).toEqual(before); // no coercion, defaulting or silent removal
    });
  }

  it('checks the suite runner against a falsely labelled invalid fixture', () => {
    const broken = structuredClone(bundle);
    const example = broken.examples.find((entry: { id: string }) => entry.id === 'money-fraction')!;
    example.data.amountMinor = 25000;
    expect(() => validateExamples(broken, ajv)).toThrow('money-fraction');
  });

  it('rejects fractional pieces and decimal money even after wire serialization', () => {
    const pieces = ajv.getSchema(`${namespace}common.schema.json#/$defs/PieceCount`)!;
    const money = ajv.getSchema(`${namespace}common.schema.json#/$defs/Money`)!;
    expect(pieces(JSON.parse(JSON.stringify(1.5)))).toBe(false);
    expect(money(JSON.parse('{"amountMinor":"250.00","currency":"EGP","exponent":2}'))).toBe(false);
    expect(money({ amountMinor: 25000, currency: 'EGP', exponent: 2 })).toBe(true);
    expect(money({ amountMinor: 25000, currency: 'EGP', exponent: 2, paid: true })).toBe(false);
  });

  it('preserves each valid example unchanged through the JSON wire boundary', () => {
    for (const example of bundle.examples.filter((entry: { valid: boolean }) => entry.valid)) {
      const transported = JSON.parse(JSON.stringify(example.data));
      expect(transported).toEqual(example.data);
      expect(ajv.getSchema(new URL(example.schema, namespace).href)!(transported)).toBe(true);
    }
  });

  it('keeps receipt, business commit and ERP application distinct', () => {
    const validate = ajv.getSchema(`${namespace}evidence-receipt.v1.schema.json`)!;
    const receipt = structuredClone(bundle.examples.find((entry: { id: string }) => entry.id === 'evidence-pending')!.data);
    expect(validate(receipt)).toBe(true);
    expect(validate({ ...receipt, committedAt: receipt.receivedAt })).toBe(false);
    expect(validate({ ...receipt, businessStatus: 'applied' })).toBe(false);
    expect(validate({ ...receipt, businessStatus: 'accepted' })).toBe(false);
  });

  it('validates independent versions without requiring route equality to assignment or device generation', () => {
    const validate = ajv.getSchema(`${namespace}common.schema.json#/$defs/Versions`)!;
    expect(validate({ routeRevision: 19, assignmentGeneration: 2, deviceGeneration: 3, outcomeRevision: 4 })).toBe(true);
    expect(validate({ routeRevision: 19, assignmentGeneration: '19' })).toBe(false);
    // Compatibility with actual state remains a P17/P34 transactional check.
  });

  it('does not publish designed operations as available HTTP paths', () => {
    for (const path of Object.keys(bundle.api.paths)) expect(path).toMatch(/^\/api\/(session\/|account\/status$|v1\/(?:provisioning\/|independent\/tasks|intake\/|locations|maps\/|planning\/|rounds\/|current\/|outcomes\/|routing\/profiles$))/);
    checkCatalog(bundle, ajv);
    expect(bundle.api['x-lifecycle']).toBe('implemented');
    expect(bundle.api.servers).toBeUndefined();
  });

  it('covers every master-plan family with unique owned operations and real example references', () => {
    checkCatalog(bundle, ajv);
    const available = bundle.catalog.operations.filter((entry: { lifecycle: string }) => entry.lifecycle !== 'designed');
    expect(available.map((entry: { id: string }) => entry.id)).toContain('session.getContext');
    expect(available.every((entry: { family: string; id: string; ownerPhase: number }) => entry.family === 'session-context' || entry.id === 'workspace.getHealth'
      || (entry.ownerPhase === 8 && entry.family === 'integration-provisioning') || ([9, 10].includes(entry.ownerPhase) && entry.family === 'intake')
      || (entry.ownerPhase === 10 && entry.id === 'task.urgencyChanged') || (entry.ownerPhase === 11 && entry.family === 'locations')
      || (entry.ownerPhase === 12 && ['routing.getVehicleProfiles','routing.computeRoadRoute','routing.optimize'].includes(entry.id))
      || ([15,16,17].includes(entry.ownerPhase) && entry.family === 'execution') || (entry.ownerPhase === 14 && entry.id === 'planning.setManualOrder')
      || (entry.ownerPhase === 13 && ['planning.saveDraft','planning.requestPreview','planning.requestReplan','planning.getJob','planning.getPlan','planning.publishRevision','plan.revisionPublished'].includes(entry.id)))).toBe(true);
    expect(Object.keys(bundle.api.paths).filter(path=>path.includes('/routing/'))).toEqual(['/api/v1/routing/profiles']);
  });

  it('rejects missing owners, omitted families, duplicate IDs and invented public availability', () => {
    const noOwner = structuredClone(bundle);
    delete noOwner.catalog.operations[0].ownerPhase;
    expect(() => checkCatalog(noOwner, ajv)).toThrow('Missing/invalid owner');
    const missing = structuredClone(bundle);
    missing.catalog.operations = missing.catalog.operations.filter((entry: { family: string }) => entry.family !== 'returns');
    expect(() => checkCatalog(missing, ajv)).toThrow('Missing master-plan family: returns');
    const duplicate = structuredClone(bundle);
    duplicate.catalog.operations.push(duplicate.catalog.operations[0]);
    expect(() => checkCatalog(duplicate, ajv)).toThrow('duplicate operation ID');
    const invented = structuredClone(bundle);
    invented.api.paths = { '/test-only-mutation': { post: { operationId: 'round.end' } } };
    expect(() => checkCatalog(invented, ajv)).toThrow('Unimplemented operation exposed');
  });

  it('keeps return-request and replacement-snapshot examples honest about their evidence', () => {
    const sample = (id: string) => bundle.examples.find((entry: { id: string }) => entry.id === id)!.data;
    const requested = sample('event-return-request');
    expect(requested.payload).toEqual({ returnRequestId: expect.any(String), offeredPieces: 1, state: 'requested' });
    const transitions = ['event-outcome-transition', 'event-return-request', 'event-correction-transition'].map(sample);
    const snapshot = sample('event-progress-snapshot');
    expect(new Set([...transitions, snapshot].map((event) => event.eventId)).size).toBe(4);
    expect(new Set(transitions.map((event) => event.correlation.actionId)).size).toBe(3);
    expect(sample('event-correction-transition').versions.outcomeRevision).toBeGreaterThan(sample('event-outcome-transition').versions.outcomeRevision);
    expect(transitions.every((event) => event.eventKind === 'transition')).toBe(true);
    expect(snapshot.eventKind).toBe('replacement-snapshot');
    // Illustrative payload review only, not a P21 receipt or P26 replay implementation.
  });

  it('generates identical portable client/reference bytes and detects checked-in drift', async () => {
    const first = await generateArtifacts(bundle);
    const second = await generateArtifacts(bundle);
    expect(first).toEqual(second);
    for (const [path, content] of first) expect(await readFile(resolve(root, path), 'utf8'), path).toBe(content);
    const client = first.get('packages/api-client/src/schema.d.ts')!;
    expect(client).not.toMatch(/from ["'](?:@tawsel\/(?:domain|shared)|.*apps\/api)/);
    expect(first.get('docs/reference/public-contract.md')).toContain('Planning stores validated ready/partial and explicit manual revisions. P15 starts one online authoritative round with immutable first-forecast references.');
    expect(first.get('docs/reference/public-contract.md')).toContain('later execution and signed event delivery remain unavailable/unimplemented.');
  });
});
