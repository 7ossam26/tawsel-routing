export class ConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export function requireConfigurationValue(
  environment: Readonly<Record<string, string | undefined>>,
  name: string
): string {
  const value = environment[name]?.trim();

  if (!value) {
    throw new ConfigurationError(`${name} is required`);
  }

  return value;
}

export function parsePort(value: string, name: string): number {
  if (!/^\d+$/.test(value)) {
    throw new ConfigurationError(`${name} must be an integer between 1 and 65535`);
  }

  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new ConfigurationError(`${name} must be an integer between 1 and 65535`);
  }

  return port;
}

export function parseHttpUrl(value: string, name: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new ConfigurationError(`${name} must be an absolute HTTP(S) URL`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ConfigurationError(`${name} must be an absolute HTTP(S) URL`);
  }

  return url.toString().replace(/\/$/, '');
}

export interface HealthResponse {
  service: 'tawsel-api';
  status: 'ok';
  scope: 'workspace';
  engine: 'not-checked';
}
