import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/provisioning-browser', workers: 1, timeout: 60000,
  outputDir: './output/playwright/phase-08-results', reporter: 'list',
  use: { baseURL: 'http://localhost:5173', locale: 'ar-EG', timezoneId: 'Africa/Cairo', reducedMotion: 'reduce',
    viewport: { width: 390, height: 844 }, trace: 'off', actionTimeout: 15000 },
  webServer: [
    { command: 'node --env-file=.env.database.local --env-file=.env.identity.local --env-file=.env.provisioning.local --import tsx apps/api/src/main.ts',
      url: 'http://127.0.0.1:3001/health', reuseExistingServer: true, env: { TAWSEL_API_HOST: '127.0.0.1', TAWSEL_API_PORT: '3001' } },
    { command: 'npm run dev -w @tawsel/web -- --host localhost', url: 'http://localhost:5173', reuseExistingServer: true, env: { VITE_TAWSEL_API_BASE_URL: 'http://127.0.0.1:3001' } }
  ]
});
