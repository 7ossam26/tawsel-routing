import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/pilot-browser', workers: 1, timeout: 240000,
  expect: { timeout: 15000 }, outputDir: 'output/playwright/phase-41-results', reporter: 'list',
  use: { baseURL: 'http://localhost:5173', viewport: { width: 390, height: 844 }, locale: 'ar-EG', timezoneId: 'Africa/Cairo', reducedMotion: 'reduce', trace: 'retain-on-failure', actionTimeout: 20000 },
  webServer: [
    { command: 'node --env-file=.env.database.local --import tsx scripts/pilot-browser-server.ts', url: 'http://127.0.0.1:3041/health', reuseExistingServer: false, timeout: 120000 },
    { command: 'node ../../node_modules/vite/bin/vite.js --host localhost --port 5173', cwd: 'apps/web', url: 'http://localhost:5173', reuseExistingServer: false, env: { VITE_TAWSEL_API_BASE_URL: 'http://127.0.0.1:3041' } }
  ]
});
