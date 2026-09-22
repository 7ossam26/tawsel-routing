import { EngineError, type Mode } from './models.js';

export const profiles = {
  car: { port: 5001, pathProfile: 'driving', vroomProfile: 'car', service: 'osrm-car', dataset: 'egypt-260913.osrm' },
  motorcycle: { port: 5003, pathProfile: 'driving', vroomProfile: 'motorcycle', service: 'osrm-motorcycle', dataset: 'egypt-motorcycle.osrm' },
  bicycle: { port: 5002, pathProfile: 'cycling', vroomProfile: 'bike', service: 'osrm-bicycle', dataset: 'egypt-bicycle.osrm' }
} as const;
export interface EngineConfig {
  osrm: Record<Mode, string>;
  vroom: string;
  timeoutMs: number;
  maxConcurrent: number;
  maxResponseBytes: number;
}
function origin(value: string): string {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    return url.origin;
  } catch { throw new EngineError('invalid_config'); }
}
export function validateConfig(config: EngineConfig): EngineConfig {
  const osrm = Object.fromEntries(Object.keys(profiles).map(mode => [mode, origin(config.osrm[mode as Mode])])) as Record<Mode,string>;
  if (new Set(Object.values(osrm)).size !== 3) throw new EngineError('invalid_config');
  for (const [value, max] of [[config.timeoutMs, 60000],[config.maxConcurrent,32],[config.maxResponseBytes,8388608]]) {
    if (!Number.isSafeInteger(value) || value! < 1 || value! > max!) throw new EngineError('invalid_config');
  }
  return { ...config, osrm, vroom: origin(config.vroom) };
}
/** Only operator-owned configuration; never bind URLs from API requests. */
export function loadEngineConfig(env: NodeJS.ProcessEnv = process.env): EngineConfig {
  return validateConfig({
    osrm: {
      car: env.TAWSEL_OSRM_CAR_URL ?? 'http://127.0.0.1:5001',
      motorcycle: env.TAWSEL_OSRM_MOTORCYCLE_URL ?? 'http://127.0.0.1:5003',
      bicycle: env.TAWSEL_OSRM_BICYCLE_URL ?? 'http://127.0.0.1:5002'
    },
    vroom: env.TAWSEL_VROOM_URL ?? 'http://127.0.0.1:3000',
    timeoutMs: Number(env.TAWSEL_ENGINE_TIMEOUT_MS ?? 5000),
    maxConcurrent: Number(env.TAWSEL_ENGINE_MAX_CONCURRENT ?? 4),
    maxResponseBytes: 2097152
  });
}
