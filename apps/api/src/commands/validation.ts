import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ajv = new Ajv2020({ strict: true, allErrors: true, coerceTypes: false });
// NodeNext exposes this CJS package's callable export as default.default in its types.
const formats = addFormats as unknown as (instance: Ajv2020) => void;
formats(ajv);
const base = new URL('../../../../contracts/', import.meta.url);
for (const name of ['common.schema.json', 'action-envelope.v1.schema.json', 'evidence-receipt.v1.schema.json', 'action-result.v1.schema.json']) {
  ajv.addSchema(JSON.parse(readFileSync(new URL(name, base), 'utf8')));
}
export function validateProtocol(kind: 'action-envelope' | 'action-result', value: unknown): void {
  if (!ajv.validate(`https://schemas.tawsel.invalid/v1/${kind}.v1.schema.json`, value)) {
    throw new Error(`Invalid ${kind}: ${ajv.errorsText()}`);
  }
}
