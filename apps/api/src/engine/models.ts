import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { components } from '@tawsel/api-client';

export type Mode = components['schemas']['RoutingMode'];
export type Coordinates = components['schemas']['Coordinates'];
export type OptimizationInput = components['schemas']['RoutingOptimizationInput'];
export type OptimizationResult = components['schemas']['RoutingOptimizationResult'];
export type RouteInput = components['schemas']['RoutingRouteInput'];
export type RouteResult = components['schemas']['RoutingRouteResult'];
export type TableInput = components['schemas']['RoutingTableInput'];
export type TableResult = components['schemas']['RoutingTableResult'];
type Failure = components['schemas']['RoutingFailure'];
export class EngineError extends Error {
  constructor(readonly code: Failure['code'], readonly provider: Failure['provider'] = 'boundary') {
    super(`Routing dependency: ${code}`);
    this.name = 'EngineError';
  }
  toJSON(): Failure { return { code: this.code, provider: this.provider }; }
}
const ajv = new Ajv2020({strict: true, allErrors: false});
(addFormats as unknown as (a: Ajv2020) => void)(ajv);
for (const file of ['common.schema.json','routing.schema.json']) {
  ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${file}`, import.meta.url),'utf8')));
}
export function validateModel(name: string, value: unknown, output = false): void {
  if (!ajv.validate(`https://schemas.tawsel.invalid/v1/routing.schema.json#/$defs/${name}`, value)) {
    throw new EngineError(output ? 'invalid_response' : 'invalid_input');
  }
}
export const toProviderCoordinates = (value: Coordinates): [number, number] => [value.longitude, value.latitude];
