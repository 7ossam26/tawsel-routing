import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'fast',
          include: ['apps/**/test/fast/**/*.test.ts', 'packages/**/test/fast/**/*.test.ts']
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
