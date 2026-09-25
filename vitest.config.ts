import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Bound process startup on hosts also running PostgreSQL and the local issuer.
    // Transaction/race tests still create their own independent connections.
    maxWorkers: 4,
    projects: [
      {
        extends: true,
        test: {
          name: 'fast',
          setupFiles: ['apps/web/test/storage-setup.ts'],
          include: ['apps/**/test/fast/**/*.test.{ts,tsx}', 'packages/**/test/fast/**/*.test.{ts,tsx}']
        }
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['apps/**/test/integration/**/*.test.ts', 'tests/integration/**/*.test.ts'],
          testTimeout: 10_000
        }
      }
    ]
  }
});
