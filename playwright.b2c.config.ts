import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/b2c-browser', workers: 1, timeout: 120_000,
  outputDir: './output/playwright/phase-09-results',
  reporter: [['list'], ['html', { outputFolder: './output/playwright/phase-09-report', open: 'never' }]],
  use: { baseURL: 'http://localhost:5173', locale: 'ar-EG', timezoneId: 'Africa/Cairo', reducedMotion: 'reduce',
    trace: 'retain-on-failure', actionTimeout: 15_000, navigationTimeout: 20_000 },
  webServer: [
    { command: 'node --env-file=.env.database.local --env-file=.env.identity.local --import tsx apps/api/src/main.ts', url: 'http://127.0.0.1:3002/health', reuseExistingServer: false, env: { TAWSEL_API_HOST: '127.0.0.1', TAWSEL_API_PORT: '3002' } },
    { command: 'npm run dev -w @tawsel/web -- --host localhost', url: 'http://localhost:5173', reuseExistingServer: false, env: { VITE_TAWSEL_API_BASE_URL: 'http://127.0.0.1:3002' } }
  ]
});
