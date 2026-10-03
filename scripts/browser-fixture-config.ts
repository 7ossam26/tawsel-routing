/** Private browser orchestration only; the application's production origin is separate. */
export function browserFixtureConfig(env: Record<string, string | undefined> = process.env) {
  const raw = env.TAWSEL_BROWSER_PORT ?? '5173';
  const port = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(port) || port < 1024 || port > 65535) {
    throw new Error('TAWSEL_BROWSER_PORT must be an integer between 1024 and 65535');
  }
  return { port, origin: `http://localhost:${port}` };
}
