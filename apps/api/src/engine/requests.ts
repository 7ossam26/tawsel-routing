import { EngineError, toProviderCoordinates, validateModel, type OptimizationInput, type RouteInput, type TableInput } from './models.js';
import { profiles, type EngineConfig } from './config.js';

export const DEFAULT_CUSTOMER_SERVICE_SECONDS = 600;
/** Temporary solver IDs and payload stay inside this boundary. */
export function optimizationRequest(input: OptimizationInput) {
  validateModel('OptimizationInput', input);
  if (new Set(input.tasks.map(t => t.taskId)).size !== input.tasks.length ||
    (input.accountKind === 'company' && input.endpoint.kind === 'fixed') ||
    (input.accountKind === 'personal' && input.endpoint.kind === 'branch') ||
    input.tasks.length + (input.endpoint.kind === 'branch' ? 1 : 0) > 50) throw new EngineError('invalid_input');
  const jobs = input.tasks.map((task,index) => ({ id: index + 1, location: toProviderCoordinates(task.coordinates), service: task.serviceEstimateSeconds ?? DEFAULT_CUSTOMER_SERVICE_SECONDS }));
  const vehicle = { id: 1, profile: profiles[input.mode].vroomProfile, start: toProviderCoordinates(input.origin.coordinates),
    ...(input.endpoint.kind === 'last-customer' ? {} : { end: toProviderCoordinates(input.endpoint.coordinates) }) };
  return { payload: { jobs, vehicles: [vehicle] }, ids: new Map(input.tasks.map((task,index) => [index + 1, task])) };
}
export function osrmUrl(config: EngineConfig, operation: 'route' | 'table', input: RouteInput | TableInput): URL {
  validateModel(operation === 'route' ? 'RouteInput' : 'TableInput',input);
  const points = input.coordinates.map(c => toProviderCoordinates(c).join(',')).join(';');
  const url = new URL(`/${operation}/v1/${profiles[input.mode].pathProfile}/${points}`,config.osrm[input.mode]);
  url.search = operation === 'route' ? 'alternatives=false&steps=false&overview=full&geometries=geojson' : 'annotations=duration,distance';
  return url;
}
