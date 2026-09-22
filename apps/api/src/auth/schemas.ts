import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
const ajv = new Ajv2020({ strict: true, coerceTypes: false });
(addFormats as unknown as (instance: Ajv2020) => void)(ajv);
for (const name of ['common.schema.json', 'session.schema.json']) {
  ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${name}`, import.meta.url), 'utf8')));
}
export const conforms = (name: string, value: unknown) => ajv.validate(`https://schemas.tawsel.invalid/v1/session.schema.json#/$defs/${name}`, value);
