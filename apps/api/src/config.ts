import {
  parsePort,
  requireConfigurationValue
} from '@tawsel/shared';

export interface ApiConfig {
  host: string;
  port: number;
}

export function parseApiConfig(environment: NodeJS.ProcessEnv): ApiConfig {
  const host = requireConfigurationValue(environment, 'TAWSEL_API_HOST');
  const port = parsePort(
    requireConfigurationValue(environment, 'TAWSEL_API_PORT'),
    'TAWSEL_API_PORT'
  );

  return { host, port };
}
